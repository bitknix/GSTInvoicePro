from typing import Any, List, Optional
from datetime import datetime, date
from calendar import monthrange

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app import models, schemas
from app.api import deps

router = APIRouter()


@router.get("/monthly", response_model=schemas.MonthlySummary)
def get_monthly_summary(
    *,
    db: Session = Depends(deps.get_db),
    year: int = Query(..., description="Year (YYYY)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    business_profile_id: Optional[int] = Query(None, description="Business profile ID (optional)"),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get monthly tax summary.
    
    Returns tax summary for the specified month including:
    - Total taxable amount
    - CGST, SGST, IGST breakup
    - Total tax amount
    - Total invoice amount
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
    if business_profile_id:
        # Verify business profile belongs to user
        business_profile = db.query(models.BusinessProfile).filter(
            models.BusinessProfile.id == business_profile_id,
            models.BusinessProfile.user_id == current_user.id
        ).first()
        
        if not business_profile:
            raise HTTPException(status_code=404, detail="Business profile not found")
        
        query = query.filter(models.Invoice.business_profile_id == business_profile_id)
    
    # Get all invoices for the month
    invoices = query.all()
    
    if not invoices:
        # Return empty summary
        return {
            "year": year,
            "month": month,
            "business_profile_id": business_profile_id,
            "total_invoices": 0,
            "total_taxable_amount": 0,
            "total_cgst": 0,
            "total_sgst": 0,
            "total_igst": 0,
            "total_tax": 0,
            "total_amount": 0
        }
    
    # Calculate summary
    total_invoices = len(invoices)
    total_taxable_amount = sum(invoice.subtotal for invoice in invoices)
    total_cgst = sum(invoice.cgst_total or 0 for invoice in invoices)
    total_sgst = sum(invoice.sgst_total or 0 for invoice in invoices)
    total_igst = sum(invoice.igst_total or 0 for invoice in invoices)
    total_tax = total_cgst + total_sgst + total_igst
    total_amount = sum(invoice.total for invoice in invoices)
    
    return {
        "year": year,
        "month": month,
        "business_profile_id": business_profile_id,
        "total_invoices": total_invoices,
        "total_taxable_amount": round(total_taxable_amount, 2),
        "total_cgst": round(total_cgst, 2),
        "total_sgst": round(total_sgst, 2),
        "total_igst": round(total_igst, 2),
        "total_tax": round(total_tax, 2),
        "total_amount": round(total_amount, 2)
    } 