from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field


class CustomerSummary(BaseModel):
    id: int
    name: str
    totalAmount: float


class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str
    customer_name: str
    invoice_date: str
    grand_total: float
    payment_status: str


class MonthlyTaxData(BaseModel):
    month: str
    cgst: float
    sgst: float
    igst: float


class DashboardData(BaseModel):
    totalInvoices: int
    taxableAmount: float
    cgstAmount: float
    sgstAmount: float
    igstAmount: float
    pendingPayments: float
    topCustomers: List[CustomerSummary]
    recentInvoices: List[InvoiceSummary]
    monthlyData: List[MonthlyTaxData] 