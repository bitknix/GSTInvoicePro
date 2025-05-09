from typing import Any, List
from datetime import datetime, date
from calendar import monthrange
import json
import io
import csv
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.utils.nic_json_utils import invoice_to_nic_json, nic_json_to_invoice

router = APIRouter()


@router.get("/invoice/{invoice_id}/json", response_model=schemas.NICJSONExport)
def export_invoice_to_nic_json(
    *,
    db: Session = Depends(deps.get_db),
    invoice_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export an invoice to NIC-compliant JSON format
    """
    # Get invoice with business profile and items
    invoice = db.query(models.Invoice).join(
        models.BusinessProfile
    ).filter(
        models.Invoice.id == invoice_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get business profile and customer
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == invoice.business_profile_id
    ).first()
    
    customer = db.query(models.Customer).filter(
        models.Customer.id == invoice.customer_id
    ).first()
    
    # Get invoice items with product details
    items = db.query(models.InvoiceItem, models.Product).join(
        models.Product
    ).filter(
        models.InvoiceItem.invoice_id == invoice.id
    ).all()
    
    # Convert to NIC JSON format
    nic_json = invoice_to_nic_json(invoice, business_profile, customer, items)
    
    return {"invoice_data": nic_json}


@router.post("/invoice/import-json", response_model=schemas.Invoice)
def import_invoice_from_nic_json(
    *,
    db: Session = Depends(deps.get_db),
    json_data: schemas.NICJSONImport,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Import an invoice from NIC-compliant JSON format
    """
    try:
        # Convert from NIC JSON format to invoice
        invoice = nic_json_to_invoice(json_data.json_data, db, current_user.id)
        return invoice
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error importing JSON: {str(e)}")


@router.get("/invoices/export-csv")
def export_invoices_to_csv(
    *,
    db: Session = Depends(deps.get_db),
    year: int = Query(..., description="Year (YYYY)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    business_profile_id: int = Query(..., description="Business profile ID"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export invoices to CSV for a specific month
    """
    # Validate year and month
    try:
        # Create date object for the first day of the month
        start_date = date(year, month, 1)
        # Get the last day of the month
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid year or month")
    
    # Verify business profile belongs to user
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # Get invoices for the month and business profile
    invoices = db.query(models.Invoice).filter(
        models.Invoice.business_profile_id == business_profile_id,
        models.Invoice.invoice_date >= start_date,
        models.Invoice.invoice_date <= end_date
    ).all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="No invoices found for this month")
    
    # Get customers associated with these invoices
    customer_ids = [invoice.customer_id for invoice in invoices]
    customers = {
        c.id: c for c in db.query(models.Customer).filter(models.Customer.id.in_(customer_ids)).all()
    }
    
    # Prepare data for CSV
    invoice_data = []
    for invoice in invoices:
        customer = customers.get(invoice.customer_id)
        invoice_data.append({
            "Invoice Number": invoice.invoice_number,
            "Invoice Date": invoice.invoice_date.strftime("%d-%m-%Y"),
            "Customer Name": customer.name if customer else "",
            "Customer GSTIN": customer.gstin if customer else "",
            "Taxable Amount": invoice.subtotal,
            "CGST": invoice.cgst_total if invoice.cgst_total else 0,
            "SGST": invoice.sgst_total if invoice.sgst_total else 0,
            "IGST": invoice.igst_total if invoice.igst_total else 0,
            "Total Tax": invoice.tax_amount,
            "Total Amount": invoice.total
        })
    
    # Create CSV in memory
    output = io.StringIO()
    fieldnames = invoice_data[0].keys()
    
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(invoice_data)
    
    # Move cursor to the beginning
    output.seek(0)
    
    # Return the CSV as a streaming response
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=invoices_{year}_{month:02d}.csv"
        }
    )


@router.get("/invoices/export-excel")
def export_invoices_to_excel(
    *,
    db: Session = Depends(deps.get_db),
    year: int = Query(..., description="Year (YYYY)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    business_profile_id: int = Query(..., description="Business profile ID"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export invoices to Excel for a specific month
    """
    # Validate year and month
    try:
        # Create date object for the first day of the month
        start_date = date(year, month, 1)
        # Get the last day of the month
        _, last_day = monthrange(year, month)
        end_date = date(year, month, last_day)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid year or month")
    
    # Verify business profile belongs to user
    business_profile = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.id == business_profile_id,
        models.BusinessProfile.user_id == current_user.id
    ).first()
    
    if not business_profile:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # Get invoices for the month and business profile
    invoices = db.query(models.Invoice).filter(
        models.Invoice.business_profile_id == business_profile_id,
        models.Invoice.invoice_date >= start_date,
        models.Invoice.invoice_date <= end_date
    ).all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="No invoices found for this month")
    
    # Get customers associated with these invoices
    customer_ids = [invoice.customer_id for invoice in invoices]
    customers = {
        c.id: c for c in db.query(models.Customer).filter(models.Customer.id.in_(customer_ids)).all()
    }
    
    # Prepare data for Excel
    invoice_data = []
    for invoice in invoices:
        customer = customers.get(invoice.customer_id)
        invoice_data.append({
            "Invoice Number": invoice.invoice_number,
            "Invoice Date": invoice.invoice_date.strftime("%d-%m-%Y"),
            "Customer Name": customer.name if customer else "",
            "Customer GSTIN": customer.gstin if customer else "",
            "Taxable Amount": invoice.subtotal,
            "CGST": invoice.cgst_total if invoice.cgst_total else 0,
            "SGST": invoice.sgst_total if invoice.sgst_total else 0,
            "IGST": invoice.igst_total if invoice.igst_total else 0,
            "Total Tax": invoice.tax_amount,
            "Total Amount": invoice.total
        })
    
    # Create a pandas DataFrame
    df = pd.DataFrame(invoice_data)
    
    # Create Excel in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Invoices', index=False)
    
    # Move cursor to the beginning
    output.seek(0)
    
    # Return the Excel file as a streaming response
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=invoices_{year}_{month:02d}.xlsx"
        }
    ) 