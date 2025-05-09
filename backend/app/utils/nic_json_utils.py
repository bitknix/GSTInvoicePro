from typing import Dict, List, Tuple, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Invoice, BusinessProfile, Customer, InvoiceItem, Product, TaxType


def invoice_to_nic_json(
    invoice: Invoice,
    business_profile: BusinessProfile,
    customer: Customer,
    items: List[Tuple[InvoiceItem, Product]]
) -> Dict[str, Any]:
    """
    Convert invoice data to NIC JSON format
    """
    # Determine and normalize supply type for GST portal compatibility
    if hasattr(invoice, 'supply_type'):
        raw_supply_type = str(invoice.supply_type).split('.')[-1]
        
        # Map internal supply types to GST portal supply types
        supply_type_mapping = {
            'B2B': 'B2B',
            'B2C': 'B2C',
            'EXPORT_WITH_TAX': 'EXPWP',  # Export With Payment of Tax
            'EXPORT_WITHOUT_TAX': 'EXPWOP',  # Export Without Payment of Tax
            'SEZ_WITH_TAX': 'SEZWP',  # SEZ With Payment of Tax
            'SEZ_WITHOUT_TAX': 'SEZWOP',  # SEZ Without Payment of Tax
            'DEEMED_EXPORT': 'DEXP',  # Deemed Export
            'COMPOSITE': 'COMP'  # Composition Dealer
        }
        
        supply_type = supply_type_mapping.get(raw_supply_type, 'B2B')
    else:
        supply_type = 'B2B'
    
    # Determine if this is an export transaction
    is_export = supply_type in ['EXPWP', 'EXPWOP']
    
    # Basic structure for NIC format
    nic_json = {
        "Version": "1.1",
        "TranDtls": {
            "TaxSch": "GST",
            "SupTyp": supply_type,
            "RegRev": "N",
            "EcmGstin": None,
            "IgstOnIntra": "N"
        },
        "DocDtls": {
            "Typ": "INV",
            "No": invoice.invoice_number,
            "Dt": invoice.invoice_date.strftime("%d/%m/%Y")
        },
        "SellerDtls": {
            "Gstin": business_profile.gstin,
            "LglNm": business_profile.name,
            "TrdNm": business_profile.name,
            "Addr1": business_profile.address,
            "Loc": business_profile.state,
            "Pin": business_profile.pin or 110001,  # Default to Delhi pincode if not available
            "Stcd": get_state_code(business_profile.state),
            "Ph": business_profile.phone or "",
            "Em": business_profile.email or ""
        },
        "BuyerDtls": {
            "Gstin": get_customer_gstin(customer, supply_type),
            "LglNm": customer.name,
            "TrdNm": customer.name,
            "Pos": "96" if is_export else get_state_code(customer.state),
            "Addr1": customer.address,
            "Loc": customer.state,
            "Pin": customer.pincode or 110001,  # Default to Delhi pincode if not available
            "Stcd": "96" if is_export else get_state_code(customer.state),
            "Ph": customer.phone or "",
            "Em": customer.email or ""
        },
        "ItemList": [],
        "ValDtls": {
            "AssVal": round(float(invoice.subtotal), 2),
            "CgstVal": round(float(invoice.cgst_total or 0), 2),
            "SgstVal": round(float(invoice.sgst_total or 0), 2),
            "IgstVal": round(float(invoice.igst_total or 0), 2),
            "TotInvVal": round(float(invoice.total), 2),
            "RndOffAmt": round(float(invoice.round_off if hasattr(invoice, 'round_off') else 0), 2)
        }
    }
    
    # Add items
    for i, (item, product) in enumerate(items, 1):
        nic_item = {
            "SlNo": str(i),
            "PrdDesc": product.name,
            "IsServc": "Y" if product.hsn_sac.startswith("99") else "N",  # Service HSN starts with 99
            "HsnCd": product.hsn_sac,
            "Qty": round(float(item.quantity), 3),
            "Unit": product.unit,
            "UnitPrice": round(float(item.rate), 2),
            "TotAmt": round(float(item.subtotal), 2),
            "Discount": round(float(item.discount_amount if hasattr(item, 'discount_amount') else 0), 2),
            "AssAmt": round(float(item.subtotal), 2),
            "GstRt": round(float(product.tax_rate), 2),
            "TotItemVal": round(float(item.total), 2)
        }
        
        # Set tax values based on tax type
        if invoice.tax_type == TaxType.IGST:
            nic_item.update({
                "IgstAmt": round(float(item.igst), 2),
                "CgstAmt": 0,
                "SgstAmt": 0
            })
        else:
            nic_item.update({
                "IgstAmt": 0,
                "CgstAmt": round(float(item.cgst), 2),
                "SgstAmt": round(float(item.sgst), 2)
            })
            
        nic_json["ItemList"].append(nic_item)
        
    return nic_json


def nic_json_to_invoice(
    nic_json: Dict[str, Any],
    db: Session,
    user_id: int
) -> Invoice:
    """
    Convert NIC JSON format to invoice data and save to database
    """
    # Get basic invoice details
    invoice_number = nic_json["DocDtls"]["No"]
    invoice_date_str = nic_json["DocDtls"]["Dt"]
    invoice_date = datetime.strptime(invoice_date_str, "%d/%m/%Y")
    
    # Get seller details (business profile)
    seller_gstin = nic_json["SellerDtls"]["Gstin"]
    business_profile = db.query(BusinessProfile).filter(
        BusinessProfile.gstin == seller_gstin,
        BusinessProfile.user_id == user_id
    ).first()
    
    if not business_profile:
        # If business profile doesn't exist, create it
        business_profile = BusinessProfile(
            user_id=user_id,
            name=nic_json["SellerDtls"]["LglNm"],
            gstin=seller_gstin,
            address=nic_json["SellerDtls"]["Addr1"],
            state=nic_json["SellerDtls"]["Loc"],
            email=nic_json["SellerDtls"]["Em"] or None,
            phone=nic_json["SellerDtls"]["Ph"] or None,
            pin=nic_json["SellerDtls"]["Pin"] or None,  # Extract PIN from NIC JSON
            pan=seller_gstin[2:12],  # Extract PAN from GSTIN
            current_invoice_number=int(invoice_number) + 1 if invoice_number.isdigit() else 1
        )
        db.add(business_profile)
        db.flush()
    
    # Get buyer details (customer)
    buyer_gstin = nic_json["BuyerDtls"].get("Gstin")
    customer = None
    
    if buyer_gstin:
        customer = db.query(Customer).filter(
            Customer.gstin == buyer_gstin,
            Customer.user_id == user_id
        ).first()
        
    if not customer:
        # If customer doesn't exist, create it
        customer = Customer(
            user_id=user_id,
            name=nic_json["BuyerDtls"]["LglNm"],
            gstin=buyer_gstin or None,
            address=nic_json["BuyerDtls"]["Addr1"],
            state=nic_json["BuyerDtls"]["Loc"],
            email=nic_json["BuyerDtls"]["Em"] or None,
            phone=nic_json["BuyerDtls"]["Ph"] or None,
            pincode=nic_json["BuyerDtls"]["Pin"] or None,  # Extract PIN from NIC JSON
        )
        db.add(customer)
        db.flush()
    
    # Determine tax type
    has_igst = nic_json["ValDtls"]["IgstVal"] > 0
    tax_type = TaxType.IGST if has_igst else TaxType.CGST_SGST
    
    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        due_date=None,  # Not in NIC format
        business_profile_id=business_profile.id,
        customer_id=customer.id,
        notes=None,  # Not in NIC format
        tax_type=tax_type,
        subtotal=nic_json["ValDtls"]["AssVal"],
        tax_amount=(nic_json["ValDtls"]["CgstVal"] + nic_json["ValDtls"]["SgstVal"] + nic_json["ValDtls"]["IgstVal"]),
        total=nic_json["ValDtls"]["TotInvVal"],
        cgst_total=nic_json["ValDtls"]["CgstVal"] or None,
        sgst_total=nic_json["ValDtls"]["SgstVal"] or None,
        igst_total=nic_json["ValDtls"]["IgstVal"] or None,
    )
    
    db.add(invoice)
    db.flush()
    
    # Process items
    for nic_item in nic_json["ItemList"]:
        hsn_sac = nic_item["HsnCd"]
        
        # Find product if it exists
        product = db.query(Product).filter(
            Product.hsn_sac == hsn_sac,
            Product.name == nic_item["PrdDesc"],
            Product.user_id == user_id
        ).first()
        
        if not product:
            # Create product if it doesn't exist
            product = Product(
                user_id=user_id,
                name=nic_item["PrdDesc"],
                hsn_sac=hsn_sac,
                tax_rate=nic_item["GstRt"],
                unit=nic_item["Unit"],
                description=None  # Not in NIC format
            )
            db.add(product)
            db.flush()
        
        # Create invoice item
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            quantity=nic_item["Qty"],
            rate=nic_item["UnitPrice"],
            tax_rate=nic_item["GstRt"],
            tax_amount=(nic_item.get("IgstAmt", 0) + nic_item.get("CgstAmt", 0) + nic_item.get("SgstAmt", 0)),
            subtotal=nic_item["AssAmt"],
            total=nic_item["TotItemVal"],
            cgst=nic_item.get("CgstAmt", 0) or None,
            sgst=nic_item.get("SgstAmt", 0) or None,
            igst=nic_item.get("IgstAmt", 0) or None,
            tax_type=tax_type
        )
        
        db.add(invoice_item)
    
    db.commit()
    db.refresh(invoice)
    
    return invoice


def get_state_code(state_name: str) -> str:
    """
    Get state code from state name
    """
    state_codes = {
        "Andhra Pradesh": "37",
        "Arunachal Pradesh": "12",
        "Assam": "18",
        "Bihar": "10",
        "Chhattisgarh": "22",
        "Goa": "30",
        "Gujarat": "24",
        "Haryana": "06",
        "Himachal Pradesh": "02",
        "Jharkhand": "20",
        "Karnataka": "29",
        "Kerala": "32",
        "Madhya Pradesh": "23",
        "Maharashtra": "27",
        "Manipur": "14",
        "Meghalaya": "17",
        "Mizoram": "15",
        "Nagaland": "13",
        "Odisha": "21",
        "Punjab": "03",
        "Rajasthan": "08",
        "Sikkim": "11",
        "Tamil Nadu": "33",
        "Telangana": "36",
        "Tripura": "16",
        "Uttar Pradesh": "09",
        "Uttarakhand": "05",
        "West Bengal": "19",
        "Andaman and Nicobar Islands": "35",
        "Chandigarh": "04",
        "Dadra and Nagar Haveli and Daman and Diu": "26",
        "Delhi": "07",
        "Jammu and Kashmir": "01",
        "Ladakh": "38",
        "Lakshadweep": "31",
        "Puducherry": "34",
    }
    
    # Try to find exact match
    if state_name in state_codes:
        return state_codes[state_name]
    
    # Try to find partial match
    for name, code in state_codes.items():
        if name.lower() in state_name.lower() or state_name.lower() in name.lower():
            return code
    
    # Default to Delhi if no match found
    return "07"


def get_customer_gstin(customer: Customer, supply_type: str) -> str:
    """
    Get the appropriate GSTIN for a customer based on the supply type
    Returns 'URP' for B2B transactions with unregistered or foreign customers
    """
    # For export transactions, GSTIN is not required
    if supply_type in ['EXPWP', 'EXPWOP']:
        return ""
    
    # For B2B transactions without GSTIN, use URP (Unregistered Person)
    if not customer.gstin and supply_type == 'B2B':
        return "URP"
        
    return customer.gstin or ""