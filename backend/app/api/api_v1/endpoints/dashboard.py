from typing import Any, List, Optional
from datetime import datetime, date
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=schemas.DashboardData)
def get_dashboard_data(
    *,
    db: Session = Depends(deps.get_db),
    year: int = Query(..., description="Year (YYYY)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    business_id: Optional[int] = Query(None, description="Business profile ID (optional)"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get dashboard data.
    
    Returns various metrics for the dashboard including:
    - Total invoices
    - Taxable amount
    - Tax amounts (CGST, SGST, IGST)
    - Pending payments
    - Top customers
    - Recent invoices
    - Monthly tax data
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
    
    # Base query with user's business profiles
    query = db.query(
        models.Invoice
    ).join(
        models.BusinessProfile
    ).filter(
        models.BusinessProfile.user_id == current_user.id,
        models.Invoice.invoice_date >= start_date,
        models.Invoice.invoice_date <= end_date
    )
    
    # Filter by business profile if specified
    if business_id:
        # Verify business profile belongs to user
        business_profile = db.query(models.BusinessProfile).filter(
            models.BusinessProfile.id == business_id,
            models.BusinessProfile.user_id == current_user.id
        ).first()
        
        if not business_profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        query = query.filter(models.Invoice.business_profile_id == business_id)
    
    # Get all invoices for the month
    invoices = query.all()
    
    # Calculate basic metrics
    total_invoices = len(invoices)
    taxable_amount = sum(invoice.subtotal for invoice in invoices)
    cgst_amount = sum(invoice.cgst_total or 0 for invoice in invoices)
    sgst_amount = sum(invoice.sgst_total or 0 for invoice in invoices)
    igst_amount = sum(invoice.igst_total or 0 for invoice in invoices)
    
    # Calculate pending payments
    pending_payments = 0
    for invoice in invoices:
        if invoice.payment_status == 'unpaid':
            pending_payments += invoice.total
        elif invoice.payment_status == 'partial':
            pending_payments += (invoice.total - (invoice.paid_amount or 0))
    
    # Get top customers
    customers_query = db.query(
        models.Customer.id,
        models.Customer.name,
        func.sum(models.Invoice.total).label('total_amount')
    ).join(
        models.Invoice
    ).filter(
        models.Invoice.customer_id == models.Customer.id
    )
    
    # Filter by business profile if specified
    if business_id:
        customers_query = customers_query.filter(models.Invoice.business_profile_id == business_id)
        
    # Now apply grouping and ordering after all filters
    customers_query = customers_query.group_by(
        models.Customer.id
    ).order_by(
        func.sum(models.Invoice.total).desc()
    ).limit(5)
    
    top_customers = [
        {
            "id": customer.id,
            "name": customer.name,
            "totalAmount": customer.total_amount
        }
        for customer in customers_query.all()
    ]
    
    # Get recent invoices
    recent_invoices_query = db.query(models.Invoice).join(
        models.Customer
    )
    
    # Apply business profile filter before ordering and limit
    if business_id:
        recent_invoices_query = recent_invoices_query.filter(models.Invoice.business_profile_id == business_id)
    
    # Now apply ordering and limit
    recent_invoices_query = recent_invoices_query.order_by(
        models.Invoice.invoice_date.desc()
    ).limit(5)
    
    recent_invoices = [
        {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer.name,
            "invoice_date": invoice.invoice_date.isoformat(),
            "grand_total": invoice.total,
            "payment_status": invoice.payment_status
        }
        for invoice in recent_invoices_query.all()
    ]
    
    # Generate monthly data
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    
    monthly_data = []
    for i in range(12):
        month_start = date(year, i + 1, 1)
        _, month_last_day = monthrange(year, i + 1)
        month_end = date(year, i + 1, month_last_day)
        
        month_query = db.query(
            func.sum(models.Invoice.cgst_total).label('cgst'),
            func.sum(models.Invoice.sgst_total).label('sgst'),
            func.sum(models.Invoice.igst_total).label('igst')
        ).filter(
            models.Invoice.invoice_date >= month_start,
            models.Invoice.invoice_date <= month_end
        ).join(
            models.BusinessProfile
        ).filter(
            models.BusinessProfile.user_id == current_user.id
        )
        
        if business_id:
            month_query = month_query.filter(models.Invoice.business_profile_id == business_id)
        
        result = month_query.first()
        
        monthly_data.append({
            "month": month_names[i],
            "cgst": float(result.cgst or 0),
            "sgst": float(result.sgst or 0),
            "igst": float(result.igst or 0)
        })
    
    return {
        "totalInvoices": total_invoices,
        "taxableAmount": float(taxable_amount),
        "cgstAmount": float(cgst_amount),
        "sgstAmount": float(sgst_amount),
        "igstAmount": float(igst_amount),
        "pendingPayments": float(pending_payments),
        "topCustomers": top_customers,
        "recentInvoices": recent_invoices,
        "monthlyData": monthly_data
    } 