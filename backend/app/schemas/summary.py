from typing import Optional
from pydantic import BaseModel, Field


class MonthlySummary(BaseModel):
    """
    Schema for monthly tax summary response
    """
    year: int = Field(..., description="Year")
    month: int = Field(..., description="Month (1-12)")
    business_profile_id: Optional[int] = Field(None, description="Business profile ID if filtered")
    total_invoices: int = Field(..., description="Total number of invoices")
    total_taxable_amount: float = Field(..., description="Total taxable amount")
    total_cgst: float = Field(..., description="Total CGST amount")
    total_sgst: float = Field(..., description="Total SGST amount")
    total_igst: float = Field(..., description="Total IGST amount")
    total_tax: float = Field(..., description="Total tax amount (CGST+SGST+IGST)")
    total_amount: float = Field(..., description="Total invoice amount (taxable + tax)") 