from typing import Any, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.api import deps
from app.models.invoice import TaxType, DocumentType, SupplyType, InvoiceStatus, PaymentStatus
from app.utils.invoice_utils import calculate_tax, generate_invoice_pdf, generate_invoice_pdf_html, generate_gst_irp_json

router = APIRouter()


@router.get("/", response_model=List[schemas.Invoice])
def read_invoices(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve invoices.
    """
    # Join with business_profile and filter by user_id
    invoices = db.query(models.Invoice).join(
        models.BusinessProfile
    ).filter(
        models.BusinessProfile.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    # Convert SQLAlchemy objects to dictionaries for proper serialization
    result = []
    for invoice in invoices:
        # Process invoice items with product information
        serialized_items = []
        for item in invoice.items:
            item_dict = {
                "id": item.id,
                "invoice_id": item.invoice_id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "rate": item.rate,
                "tax_rate": item.tax_rate,
                "tax_amount": item.tax_amount,
                "subtotal": item.subtotal,
                "total": item.total,
                "cgst": item.cgst,
                "sgst": item.sgst,
                "igst": item.igst,
                "tax_type": item.tax_type,
                "hsn_sac": item.hsn_sac or (item.product.hsn_sac if item.product else None),
                "description": item.description or (item.product.description if item.product else None),
                "discount_percent": item.discount_percent,
                "discount_amount": item.discount_amount,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                # Include product information
                "product": {
                    "id": item.product.id,
                    "name": item.product.name,
                    "hsn_sac": item.product.hsn_sac,
                    "description": item.product.description,
                    "price": item.product.price,
                    "tax_rate": item.product.tax_rate,
                    "unit": item.product.unit,
                    "is_service": item.product.is_service if hasattr(item.product, 'is_service') else False,
                } if item.product else None
            }
            serialized_items.append(item_dict)
        
        # Create a copy of the invoice with customer and business_profile as dictionaries
        invoice_dict = {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,
            "business_profile_id": invoice.business_profile_id,
            "customer_id": invoice.customer_id,
            "subtotal": invoice.subtotal,
            "tax_amount": invoice.tax_amount,
            "total": invoice.total,
            "notes": invoice.notes,
            "tax_type": invoice.tax_type,
            "cgst_total": invoice.cgst_total,
            "sgst_total": invoice.sgst_total,
            "igst_total": invoice.igst_total,
            "status": invoice.status if hasattr(invoice, 'status') else None,
            "payment_status": invoice.payment_status if hasattr(invoice, 'payment_status') else None,
            "document_type": invoice.document_type,
            "supply_type": invoice.supply_type,
            "reference_number": invoice.reference_number,
            "place_of_supply": invoice.place_of_supply,
            "dispatch_from": invoice.dispatch_from,
            "ship_to": invoice.ship_to,
            "currency": invoice.currency,
            "port_of_export": invoice.port_of_export,
            "discount_amount": invoice.discount_amount,
            "round_off": invoice.round_off,
            "created_at": invoice.created_at,
            "updated_at": invoice.updated_at,
            "items": serialized_items,
            # Convert related objects to dictionaries
            "customer": {
                "id": invoice.customer.id,
                "name": invoice.customer.name,
                "gstin": invoice.customer.gstin if hasattr(invoice.customer, 'gstin') else None,
                "email": invoice.customer.email if hasattr(invoice.customer, 'email') else None,
                "phone": invoice.customer.phone if hasattr(invoice.customer, 'phone') else None,
                "address": invoice.customer.address if hasattr(invoice.customer, 'address') else None,
                "state": invoice.customer.state if hasattr(invoice.customer, 'state') else None,
            },
            "business_profile": {
                "id": invoice.business_profile.id,
                "name": invoice.business_profile.name,
                "gstin": invoice.business_profile.gstin if hasattr(invoice.business_profile, 'gstin') else None,
                "address": invoice.business_profile.address if hasattr(invoice.business_profile, 'address') else None,
                "state": invoice.business_profile.state if hasattr(invoice.business_profile, 'state') else None,
            }
        }
        result.append(invoice_dict)
    
    return result


@router.post("/", response_model=schemas.Invoice)
def create_invoice(
    *,
    db: Session = Depends(deps.get_db),
    invoice_in: schemas.InvoiceCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new invoice.
    """
    # Verify business profile belongs to user
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == invoice_in.business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # Verify customer belongs to user
    customer = db.query(models.Customer).filter(
        models.Customer.id == invoice_in.customer_id,
        models.Customer.user_id == current_user.id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Determine tax type (IGST or CGST/SGST)
    tax_type = TaxType.IGST if business_profile.state != customer.state else TaxType.CGST_SGST
    
    # Generate invoice number with custom format: XX-INV-YY-ZZZZZ
    # XX: First two letters of business profile name
    # YY: Last two digits of current year
    # ZZZZZ: Sequential number with leading zeros
    current_year = datetime.now().year
    year_suffix = str(current_year)[-2:]  # Last two digits of year
    
    # Get first two letters of business profile name (uppercase)
    business_prefix = business_profile.name[:2].upper() if business_profile.name else "IN"
    
    # If invoice is imported and already has a number, use it, otherwise generate new one
    invoice_number = invoice_in.invoice_number if hasattr(invoice_in, 'invoice_number') and invoice_in.invoice_number else f"{business_prefix}-INV-{year_suffix}-{business_profile.current_invoice_number:05d}"
    
    # Determine invoice status based on data
    invoice_status = invoice_in.status if invoice_in.status else InvoiceStatus.DRAFT
    
    # If IRN is provided, this is an approved e-invoice
    if invoice_in.irn:
        invoice_status = InvoiceStatus.APPROVED
    
    # Create invoice object
    invoice = models.Invoice(
        invoice_number=invoice_number,
        invoice_date=invoice_in.invoice_date,
        due_date=invoice_in.due_date,
        business_profile_id=invoice_in.business_profile_id,
        customer_id=invoice_in.customer_id,
        notes=invoice_in.notes,
        tax_type=tax_type,
        subtotal=0,  # Will be calculated
        tax_amount=0,  # Will be calculated
        total=0,  # Will be calculated
        document_type=getattr(DocumentType, invoice_in.document_type.upper().replace(' ', '_'))
            if isinstance(invoice_in.document_type, str) else invoice_in.document_type,
        supply_type=getattr(SupplyType, invoice_in.supply_type.upper().replace(' ', '_').replace('-', '_'))
            if isinstance(invoice_in.supply_type, str) else invoice_in.supply_type,
        reference_number=invoice_in.reference_number,
        place_of_supply=invoice_in.place_of_supply,
        dispatch_from=invoice_in.dispatch_from,
        ship_to=invoice_in.ship_to,
        currency=invoice_in.currency,
        port_of_export=invoice_in.port_of_export,
        discount_amount=invoice_in.discount_amount,
        round_off=invoice_in.round_off,
        status=invoice_status,
        payment_status=invoice_in.payment_status,
        
        # E-Invoice fields
        irn=invoice_in.irn,
        ack_no=invoice_in.ack_no,
        ack_date=invoice_in.ack_date,
        signed_invoice=invoice_in.signed_invoice,
        qr_code=invoice_in.qr_code,
        
        # E-way bill fields
        ewb_no=invoice_in.ewb_no,
        ewb_date=invoice_in.ewb_date,
        ewb_valid_till=invoice_in.ewb_valid_till,
        
        # Import flag
        is_imported=invoice_in.is_imported
    )
    
    db.add(invoice)
    db.flush()  # Get invoice ID without committing
    
    # Process invoice items
    subtotal = 0
    tax_amount = 0
    cgst_total = 0
    sgst_total = 0
    igst_total = 0
    
    for item_in in invoice_in.items:
        # Verify product belongs to user
        product = db.query(models.Product).filter(
            models.Product.id == item_in.product_id,
            models.Product.user_id == current_user.id
        ).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product with ID {item_in.product_id} not found")
        
        # Calculate item values
        item_subtotal = item_in.quantity * item_in.rate
        subtotal += item_subtotal
        
        # Calculate tax based on tax type
        if tax_type == TaxType.IGST:
            igst = item_subtotal * (product.tax_rate / 100)
            igst_total += igst
            tax_amount += igst
            
            item = models.InvoiceItem(
                invoice_id=invoice.id,
                product_id=item_in.product_id,
                quantity=item_in.quantity,
                rate=item_in.rate,
                tax_rate=product.tax_rate,
                tax_amount=igst,
                subtotal=item_subtotal,
                total=item_subtotal + igst,
                igst=igst,
                tax_type=tax_type,
                hsn_sac=item_in.hsn_sac or product.hsn_sac,
                description=item_in.description or product.description,
                discount_percent=item_in.discount_percent,
                discount_amount=item_in.discount_amount,
            )
        else:  # CGST_SGST
            cgst = item_subtotal * (product.tax_rate / 200)  # Half rate for CGST
            sgst = item_subtotal * (product.tax_rate / 200)  # Half rate for SGST
            cgst_total += cgst
            sgst_total += sgst
            tax_amount += (cgst + sgst)
            
            item = models.InvoiceItem(
                invoice_id=invoice.id,
                product_id=item_in.product_id,
                quantity=item_in.quantity,
                rate=item_in.rate,
                tax_rate=product.tax_rate,
                tax_amount=cgst + sgst,
                subtotal=item_subtotal,
                total=item_subtotal + cgst + sgst,
                cgst=cgst,
                sgst=sgst,
                tax_type=tax_type,
                hsn_sac=item_in.hsn_sac or product.hsn_sac,
                description=item_in.description or product.description,
                discount_percent=item_in.discount_percent,
                discount_amount=item_in.discount_amount,
            )
        
        db.add(item)
    
    # Update invoice with calculated values
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total = subtotal + tax_amount
    
    if tax_type == TaxType.IGST:
        invoice.igst_total = igst_total
    else:
        invoice.cgst_total = cgst_total
        invoice.sgst_total = sgst_total
    
    # Increment invoice counter in business profile
    business_profile.current_invoice_number += 1
    
    db.add(business_profile)
    db.commit()
    db.refresh(invoice)
    
    # Process invoice items with product information
    serialized_items = []
    for item in invoice.items:
        item_dict = {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "rate": item.rate,
            "tax_rate": item.tax_rate,
            "tax_amount": item.tax_amount,
            "subtotal": item.subtotal,
            "total": item.total,
            "cgst": item.cgst,
            "sgst": item.sgst,
            "igst": item.igst,
            "tax_type": item.tax_type,
            "hsn_sac": item.hsn_sac or (item.product.hsn_sac if item.product else None),
            "description": item.description or (item.product.description if item.product else None),
            "discount_percent": item.discount_percent,
            "discount_amount": item.discount_amount,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            # Include product information
            "product": {
                "id": item.product.id,
                "name": item.product.name,
                "hsn_sac": item.product.hsn_sac,
                "description": item.product.description,
                "price": item.product.price,
                "tax_rate": item.product.tax_rate,
                "unit": item.product.unit,
                "is_service": item.product.is_service if hasattr(item.product, 'is_service') else False,
            } if item.product else None
        }
        serialized_items.append(item_dict)
    
    # Convert SQLAlchemy objects to dictionaries for proper serialization
    invoice_dict = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "business_profile_id": invoice.business_profile_id,
        "customer_id": invoice.customer_id,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total": invoice.total,
        "notes": invoice.notes,
        "tax_type": invoice.tax_type,
        "cgst_total": invoice.cgst_total,
        "sgst_total": invoice.sgst_total,
        "igst_total": invoice.igst_total,
        "status": invoice.status if hasattr(invoice, 'status') else None,
        "payment_status": invoice.payment_status if hasattr(invoice, 'payment_status') else None,
        "document_type": invoice.document_type,
        "supply_type": invoice.supply_type,
        "reference_number": invoice.reference_number,
        "place_of_supply": invoice.place_of_supply,
        "dispatch_from": invoice.dispatch_from,
        "ship_to": invoice.ship_to,
        "currency": invoice.currency,
        "port_of_export": invoice.port_of_export,
        "discount_amount": invoice.discount_amount,
        "round_off": invoice.round_off,
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at,
        "items": serialized_items,
        # Convert related objects to dictionaries
        "customer": {
            "id": invoice.customer.id,
            "name": invoice.customer.name,
            "gstin": invoice.customer.gstin if hasattr(invoice.customer, 'gstin') else None,
            "email": invoice.customer.email if hasattr(invoice.customer, 'email') else None,
            "phone": invoice.customer.phone if hasattr(invoice.customer, 'phone') else None,
            "address": invoice.customer.address if hasattr(invoice.customer, 'address') else None,
            "state": invoice.customer.state if hasattr(invoice.customer, 'state') else None,
        },
        "business_profile": {
            "id": invoice.business_profile.id,
            "name": invoice.business_profile.name,
            "gstin": invoice.business_profile.gstin if hasattr(invoice.business_profile, 'gstin') else None,
            "address": invoice.business_profile.address if hasattr(invoice.business_profile, 'address') else None,
            "state": invoice.business_profile.state if hasattr(invoice.business_profile, 'state') else None,
        }
    }
    
    return invoice_dict


@router.get("/{invoice_id}", response_model=schemas.Invoice)
def read_invoice(
    *,
    db: Session = Depends(deps.get_db),
    invoice_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get invoice by ID.
    """
    invoice = db.query(models.Invoice).join(
        models.BusinessProfile
    ).filter(
        models.Invoice.id == invoice_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Process invoice items with product information
    serialized_items = []
    for item in invoice.items:
        item_dict = {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "rate": item.rate,
            "tax_rate": item.tax_rate,
            "tax_amount": item.tax_amount,
            "subtotal": item.subtotal,
            "total": item.total,
            "cgst": item.cgst,
            "sgst": item.sgst,
            "igst": item.igst,
            "tax_type": item.tax_type,
            "hsn_sac": item.hsn_sac or (item.product.hsn_sac if item.product else None),
            "description": item.description or (item.product.description if item.product else None),
            "discount_percent": item.discount_percent,
            "discount_amount": item.discount_amount,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            # Include product information
            "product": {
                "id": item.product.id,
                "name": item.product.name,
                "hsn_sac": item.product.hsn_sac,
                "description": item.product.description,
                "price": item.product.price,
                "tax_rate": item.product.tax_rate,
                "unit": item.product.unit,
                "is_service": item.product.is_service if hasattr(item.product, 'is_service') else False,
            } if item.product else None
        }
        serialized_items.append(item_dict)
    
    # Convert SQLAlchemy objects to dictionaries for proper serialization
    invoice_dict = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "business_profile_id": invoice.business_profile_id,
        "customer_id": invoice.customer_id,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total": invoice.total,
        "notes": invoice.notes,
        "tax_type": invoice.tax_type,
        "cgst_total": invoice.cgst_total,
        "sgst_total": invoice.sgst_total,
        "igst_total": invoice.igst_total,
        "status": invoice.status if hasattr(invoice, 'status') else None,
        "payment_status": invoice.payment_status if hasattr(invoice, 'payment_status') else None,
        "document_type": invoice.document_type,
        "supply_type": invoice.supply_type,
        "reference_number": invoice.reference_number,
        "place_of_supply": invoice.place_of_supply,
        "dispatch_from": invoice.dispatch_from,
        "ship_to": invoice.ship_to,
        "currency": invoice.currency,
        "port_of_export": invoice.port_of_export,
        "discount_amount": invoice.discount_amount,
        "round_off": invoice.round_off,
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at,
        "items": serialized_items,
        # Convert related objects to dictionaries
        "customer": {
            "id": invoice.customer.id,
            "name": invoice.customer.name,
            "gstin": invoice.customer.gstin if hasattr(invoice.customer, 'gstin') else None,
            "email": invoice.customer.email if hasattr(invoice.customer, 'email') else None,
            "phone": invoice.customer.phone if hasattr(invoice.customer, 'phone') else None,
            "address": invoice.customer.address if hasattr(invoice.customer, 'address') else None,
            "state": invoice.customer.state if hasattr(invoice.customer, 'state') else None,
        },
        "business_profile": {
            "id": invoice.business_profile.id,
            "name": invoice.business_profile.name,
            "gstin": invoice.business_profile.gstin if hasattr(invoice.business_profile, 'gstin') else None,
            "address": invoice.business_profile.address if hasattr(invoice.business_profile, 'address') else None,
            "state": invoice.business_profile.state if hasattr(invoice.business_profile, 'state') else None,
        }
    }
    
    return invoice_dict


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    *,
    db: Session = Depends(deps.get_db),
    invoice_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get invoice as PDF.
    """
    try:
        print(f"PDF generation request for invoice ID: {invoice_id}")
        
        invoice = db.query(models.Invoice).join(
            models.BusinessProfile
        ).filter(
            models.Invoice.id == invoice_id,
            models.BusinessProfile.user_id == current_user.id
        ).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        print(f"Found invoice: {invoice.invoice_number}")
        
        # Get associated business profile and customer
        business_profile = db.query(models.BusinessProfile).filter(
            models.BusinessProfile.id == invoice.business_profile_id
        ).first()
        
        if not business_profile:
            print(f"Business profile not found for ID: {invoice.business_profile_id}")
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        print(f"Found business profile: {business_profile.name}")
        
        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice.customer_id
        ).first()
        
        if not customer:
            print(f"Customer not found for ID: {invoice.customer_id}")
            raise HTTPException(status_code=404, detail="Customer not found")
        
        print(f"Found customer: {customer.name}")
        
        # Get invoice items with product details
        items = db.query(models.InvoiceItem, models.Product).join(
            models.Product
        ).filter(
            models.InvoiceItem.invoice_id == invoice.id
        ).all()
        
        if not items:
            print(f"No items found for invoice ID: {invoice_id}")
            # Continue anyway, will generate PDF with no items
        
        print(f"Found {len(items)} items for invoice")
        
        try:
            # Generate PDF
            print("Starting PDF generation...")
            from app.utils.invoice_utils import generate_invoice_pdf_html
            pdf_content = generate_invoice_pdf_html(invoice, business_profile, customer, items)
            print(f"PDF generated successfully, size: {len(pdf_content)} bytes")
            
            # Return PDF as response
            return Response(
                content=pdf_content,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=Invoice-{invoice.invoice_number}.pdf"
                }
            )
        except Exception as pdf_error:
            print(f"Error generating PDF: {str(pdf_error)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate PDF: {str(pdf_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in get_invoice_pdf: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{invoice_id}/gst-json")
def get_invoice_gst_json(
    *,
    db: Session = Depends(deps.get_db),
    invoice_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get invoice in GST IRP JSON format for e-invoicing.
    """
    try:
        print(f"GST JSON export request for invoice ID: {invoice_id}")
        
        invoice = db.query(models.Invoice).join(
            models.BusinessProfile
        ).filter(
            models.Invoice.id == invoice_id,
            models.BusinessProfile.user_id == current_user.id
        ).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        print(f"Found invoice: {invoice.invoice_number}")
        
        # Get associated business profile and customer
        business_profile = db.query(models.BusinessProfile).filter(
            models.BusinessProfile.id == invoice.business_profile_id
        ).first()
        
        if not business_profile:
            print(f"Business profile not found for ID: {invoice.business_profile_id}")
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        print(f"Found business profile: {business_profile.name}")
        
        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice.customer_id
        ).first()
        
        if not customer:
            print(f"Customer not found for ID: {invoice.customer_id}")
            raise HTTPException(status_code=404, detail="Customer not found")
        
        print(f"Found customer: {customer.name}")
        
        # Get invoice items with product details
        items = db.query(models.InvoiceItem, models.Product).join(
            models.Product
        ).filter(
            models.InvoiceItem.invoice_id == invoice.id
        ).all()
        
        if not items:
            print(f"No items found for invoice ID: {invoice_id}")
            # Continue anyway, will generate JSON with no items
        
        print(f"Found {len(items)} items for invoice")
        
        try:
            # Generate GST IRP JSON
            from app.utils.invoice_utils import generate_gst_irp_json
            gst_json = generate_gst_irp_json(invoice, business_profile, customer, items)
            
            if "error" in gst_json:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to generate GST JSON: {gst_json['error']}"
                )
            
            # Convert to JSON string
            import json
            json_content = json.dumps(gst_json, indent=2)
            
            print(f"GST JSON generated successfully")
            
            # Return JSON as response
            return Response(
                content=json_content,
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=GST-Invoice-{invoice.invoice_number}.json"
                }
            )
        except Exception as json_error:
            print(f"Error generating GST JSON: {str(json_error)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate GST JSON: {str(json_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in get_invoice_gst_json: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{invoice_id}", response_model=schemas.Invoice)
def delete_invoice(
    *,
    db: Session = Depends(deps.get_db),
    invoice_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete invoice.
    """
    invoice = db.query(models.Invoice).join(
        models.BusinessProfile
    ).filter(
        models.Invoice.id == invoice_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Create a serialized copy of the invoice before deleting it
    serialized_items = []
    for item in invoice.items:
        item_dict = {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "rate": item.rate,
            "tax_rate": item.tax_rate,
            "tax_amount": item.tax_amount,
            "subtotal": item.subtotal,
            "total": item.total,
            "cgst": item.cgst,
            "sgst": item.sgst,
            "igst": item.igst,
            "tax_type": item.tax_type,
            "hsn_sac": item.hsn_sac or (item.product.hsn_sac if item.product else None),
            "description": item.description or (item.product.description if item.product else None),
            "discount_percent": item.discount_percent,
            "discount_amount": item.discount_amount,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            # Include product information
            "product": {
                "id": item.product.id,
                "name": item.product.name,
                "hsn_sac": item.product.hsn_sac,
                "description": item.product.description,
                "price": item.product.price,
                "tax_rate": item.product.tax_rate,
                "unit": item.product.unit,
                "is_service": item.product.is_service if hasattr(item.product, 'is_service') else False,
            } if item.product else None
        }
        serialized_items.append(item_dict)
    
    # Create a serialized copy of the invoice
    invoice_dict = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "business_profile_id": invoice.business_profile_id,
        "customer_id": invoice.customer_id,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total": invoice.total,
        "notes": invoice.notes,
        "tax_type": invoice.tax_type,
        "cgst_total": invoice.cgst_total,
        "sgst_total": invoice.sgst_total,
        "igst_total": invoice.igst_total,
        "status": invoice.status if hasattr(invoice, 'status') else None,
        "payment_status": invoice.payment_status if hasattr(invoice, 'payment_status') else None,
        "document_type": invoice.document_type,
        "supply_type": invoice.supply_type,
        "reference_number": invoice.reference_number,
        "place_of_supply": invoice.place_of_supply,
        "dispatch_from": invoice.dispatch_from,
        "ship_to": invoice.ship_to,
        "currency": invoice.currency,
        "port_of_export": invoice.port_of_export,
        "discount_amount": invoice.discount_amount,
        "round_off": invoice.round_off,
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at,
        "items": serialized_items,
        # Convert related objects to dictionaries
        "customer": {
            "id": invoice.customer.id,
            "name": invoice.customer.name,
            "gstin": invoice.customer.gstin if hasattr(invoice.customer, 'gstin') else None,
            "email": invoice.customer.email if hasattr(invoice.customer, 'email') else None,
            "phone": invoice.customer.phone if hasattr(invoice.customer, 'phone') else None,
            "address": invoice.customer.address if hasattr(invoice.customer, 'address') else None,
            "state": invoice.customer.state if hasattr(invoice.customer, 'state') else None,
        },
        "business_profile": {
            "id": invoice.business_profile.id,
            "name": invoice.business_profile.name,
            "gstin": invoice.business_profile.gstin if hasattr(invoice.business_profile, 'gstin') else None,
            "address": invoice.business_profile.address if hasattr(invoice.business_profile, 'address') else None,
            "state": invoice.business_profile.state if hasattr(invoice.business_profile, 'state') else None,
        }
    }
    
    # Now delete the invoice
    db.delete(invoice)
    db.commit()
    
    return invoice_dict


@router.put("/{invoice_id}", response_model=schemas.Invoice)
def update_invoice(
    *,
    db: Session = Depends(deps.get_db),
    invoice_id: int,
    invoice_in: schemas.InvoiceUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update invoice.
    """
    # Verify invoice exists and belongs to user
    invoice = db.query(models.Invoice).join(
        models.BusinessProfile
    ).filter(
        models.Invoice.id == invoice_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Verify business profile belongs to user if being updated
    if invoice_in.business_profile_id:
        business_profile = db.query(models.BusinessProfile).filter(
            models.BusinessProfile.id == invoice_in.business_profile_id,
            models.BusinessProfile.user_id == current_user.id
        ).first()
        if not business_profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
    else:
        business_profile = invoice.business_profile
    
    # Verify customer belongs to user if being updated
    if invoice_in.customer_id:
        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice_in.customer_id,
            models.Customer.user_id == current_user.id
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    else:
        customer = invoice.customer
    
    # Determine tax type (IGST or CGST/SGST)
    tax_type = TaxType.IGST if business_profile.state != customer.state else TaxType.CGST_SGST
    
    # Update invoice fields from input
    for field in invoice_in.__dict__:
        if field != "items" and hasattr(invoice, field) and getattr(invoice_in, field) is not None:
            setattr(invoice, field, getattr(invoice_in, field))
    
    # Update tax type
    invoice.tax_type = tax_type
    
    # Delete existing items
    db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).delete()
    
    # Process new invoice items
    subtotal = 0
    tax_amount = 0
    cgst_total = 0
    sgst_total = 0
    igst_total = 0
    
    if invoice_in.items:
        for item_in in invoice_in.items:
            # Verify product belongs to user
            product = db.query(models.Product).filter(
                models.Product.id == item_in.product_id,
                models.Product.user_id == current_user.id
            ).first()
            if not product:
                db.rollback()
                raise HTTPException(status_code=404, detail=f"Product with ID {item_in.product_id} not found")
            
            # Calculate item values
            item_subtotal = item_in.quantity * item_in.rate
            subtotal += item_subtotal
            
            # Calculate tax based on tax type
            if tax_type == TaxType.IGST:
                igst = item_subtotal * (product.tax_rate / 100)
                igst_total += igst
                tax_amount += igst
                
                item = models.InvoiceItem(
                    invoice_id=invoice.id,
                    product_id=item_in.product_id,
                    quantity=item_in.quantity,
                    rate=item_in.rate,
                    tax_rate=product.tax_rate,
                    tax_amount=igst,
                    subtotal=item_subtotal,
                    total=item_subtotal + igst,
                    igst=igst,
                    tax_type=tax_type,
                    hsn_sac=item_in.hsn_sac or product.hsn_sac,
                    description=item_in.description or product.description,
                    discount_percent=item_in.discount_percent,
                    discount_amount=item_in.discount_amount,
                )
            else:  # CGST_SGST
                cgst = item_subtotal * (product.tax_rate / 200)  # Half rate for CGST
                sgst = item_subtotal * (product.tax_rate / 200)  # Half rate for SGST
                cgst_total += cgst
                sgst_total += sgst
                tax_amount += (cgst + sgst)
                
                item = models.InvoiceItem(
                    invoice_id=invoice.id,
                    product_id=item_in.product_id,
                    quantity=item_in.quantity,
                    rate=item_in.rate,
                    tax_rate=product.tax_rate,
                    tax_amount=cgst + sgst,
                    subtotal=item_subtotal,
                    total=item_subtotal + cgst + sgst,
                    cgst=cgst,
                    sgst=sgst,
                    tax_type=tax_type,
                    hsn_sac=item_in.hsn_sac or product.hsn_sac,
                    description=item_in.description or product.description,
                    discount_percent=item_in.discount_percent,
                    discount_amount=item_in.discount_amount,
                )
            
            db.add(item)
    
    # Update invoice with calculated values
    invoice.subtotal = subtotal
    invoice.tax_amount = tax_amount
    invoice.total = subtotal + tax_amount
    
    if tax_type == TaxType.IGST:
        invoice.igst_total = igst_total
        invoice.cgst_total = None
        invoice.sgst_total = None
    else:
        invoice.cgst_total = cgst_total
        invoice.sgst_total = sgst_total
        invoice.igst_total = None
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    # Process invoice items with product information
    serialized_items = []
    for item in invoice.items:
        item_dict = {
            "id": item.id,
            "invoice_id": item.invoice_id,
            "product_id": item.product_id,
            "quantity": item.quantity,
            "rate": item.rate,
            "tax_rate": item.tax_rate,
            "tax_amount": item.tax_amount,
            "subtotal": item.subtotal,
            "total": item.total,
            "cgst": item.cgst,
            "sgst": item.sgst,
            "igst": item.igst,
            "tax_type": item.tax_type,
            "hsn_sac": item.hsn_sac or (item.product.hsn_sac if item.product else None),
            "description": item.description or (item.product.description if item.product else None),
            "discount_percent": item.discount_percent,
            "discount_amount": item.discount_amount,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            # Include product information
            "product": {
                "id": item.product.id,
                "name": item.product.name,
                "hsn_sac": item.product.hsn_sac,
                "description": item.product.description,
                "price": item.product.price,
                "tax_rate": item.product.tax_rate,
                "unit": item.product.unit,
                "is_service": item.product.is_service if hasattr(item.product, 'is_service') else False,
            } if item.product else None
        }
        serialized_items.append(item_dict)
    
    # Convert SQLAlchemy objects to dictionaries for proper serialization
    invoice_dict = {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "business_profile_id": invoice.business_profile_id,
        "customer_id": invoice.customer_id,
        "subtotal": invoice.subtotal,
        "tax_amount": invoice.tax_amount,
        "total": invoice.total,
        "notes": invoice.notes,
        "tax_type": invoice.tax_type,
        "cgst_total": invoice.cgst_total,
        "sgst_total": invoice.sgst_total,
        "igst_total": invoice.igst_total,
        "status": invoice.status if hasattr(invoice, 'status') else None,
        "payment_status": invoice.payment_status if hasattr(invoice, 'payment_status') else None,
        "document_type": invoice.document_type,
        "supply_type": invoice.supply_type,
        "reference_number": invoice.reference_number,
        "place_of_supply": invoice.place_of_supply,
        "dispatch_from": invoice.dispatch_from,
        "ship_to": invoice.ship_to,
        "currency": invoice.currency,
        "port_of_export": invoice.port_of_export,
        "discount_amount": invoice.discount_amount,
        "round_off": invoice.round_off,
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at,
        "items": serialized_items,
        # Convert related objects to dictionaries
        "customer": {
            "id": invoice.customer.id,
            "name": invoice.customer.name,
            "gstin": invoice.customer.gstin if hasattr(invoice.customer, 'gstin') else None,
            "email": invoice.customer.email if hasattr(invoice.customer, 'email') else None,
            "phone": invoice.customer.phone if hasattr(invoice.customer, 'phone') else None,
            "address": invoice.customer.address if hasattr(invoice.customer, 'address') else None,
            "state": invoice.customer.state if hasattr(invoice.customer, 'state') else None,
            "country": invoice.customer.country if hasattr(invoice.customer, 'country') else None,
        },
        "business_profile": {
            "id": invoice.business_profile.id,
            "name": invoice.business_profile.name,
            "gstin": invoice.business_profile.gstin if hasattr(invoice.business_profile, 'gstin') else None,
            "address": invoice.business_profile.address if hasattr(invoice.business_profile, 'address') else None,
            "state": invoice.business_profile.state if hasattr(invoice.business_profile, 'state') else None,
        }
    }
    
    return invoice_dict