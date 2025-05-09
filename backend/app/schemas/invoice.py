from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime

from app.models.invoice import TaxType, DocumentType, SupplyType, InvoiceStatus, PaymentStatus


# InvoiceItem schemas
class InvoiceItemBase(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    rate: float = Field(..., ge=0)
    hsn_sac: Optional[str] = None
    description: Optional[str] = None
    discount_percent: Optional[float] = 0
    discount_amount: Optional[float] = 0


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemUpdate(InvoiceItemBase):
    product_id: Optional[int] = None
    quantity: Optional[float] = None
    rate: Optional[float] = None


class InvoiceItemInDBBase(InvoiceItemBase):
    id: int
    invoice_id: int
    tax_rate: float
    tax_amount: float
    subtotal: float
    total: float
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None
    tax_type: TaxType
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceItem(InvoiceItemInDBBase):
    pass


# Invoice schemas
class InvoiceBase(BaseModel):
    invoice_date: datetime
    due_date: Optional[datetime] = None
    business_profile_id: int
    customer_id: int
    notes: Optional[str] = None
    
    # New fields
    document_type: DocumentType = DocumentType.INVOICE
    supply_type: SupplyType = SupplyType.B2B
    reference_number: Optional[str] = None
    place_of_supply: Optional[str] = None
    dispatch_from: Optional[str] = None
    ship_to: Optional[str] = None
    
    # Export-specific fields
    currency: Optional[str] = "INR"
    port_of_export: Optional[str] = None
    
    # Discount
    discount_amount: Optional[float] = 0
    round_off: Optional[float] = 0
    
    # E-Invoice fields
    irn: Optional[str] = None
    ack_no: Optional[str] = None
    ack_date: Optional[str] = None
    signed_invoice: Optional[str] = None
    qr_code: Optional[str] = None
    
    # E-way bill fields
    ewb_no: Optional[str] = None
    ewb_date: Optional[str] = None
    ewb_valid_till: Optional[str] = None
    
    # Import flag
    is_imported: Optional[bool] = False


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]
    status: Optional[InvoiceStatus] = InvoiceStatus.DRAFT
    payment_status: Optional[PaymentStatus] = PaymentStatus.UNPAID


class InvoiceUpdate(BaseModel):
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    business_profile_id: Optional[int] = None
    customer_id: Optional[int] = None
    notes: Optional[str] = None
    
    # New fields
    document_type: Optional[DocumentType] = None
    supply_type: Optional[SupplyType] = None
    reference_number: Optional[str] = None
    place_of_supply: Optional[str] = None
    dispatch_from: Optional[str] = None
    ship_to: Optional[str] = None
    
    # Export-specific fields
    currency: Optional[str] = None
    port_of_export: Optional[str] = None
    
    # Discount
    discount_amount: Optional[float] = None
    round_off: Optional[float] = None
    
    # Status fields
    status: Optional[InvoiceStatus] = None
    payment_status: Optional[PaymentStatus] = None
    
    # E-Invoice fields
    irn: Optional[str] = None
    ack_no: Optional[str] = None
    ack_date: Optional[str] = None
    signed_invoice: Optional[str] = None
    qr_code: Optional[str] = None
    
    # E-way bill fields
    ewb_no: Optional[str] = None
    ewb_date: Optional[str] = None
    ewb_valid_till: Optional[str] = None
    
    # Import flag
    is_imported: Optional[bool] = None
    
    # Items
    items: Optional[List[InvoiceItemUpdate]] = None


class InvoiceInDBBase(InvoiceBase):
    id: int
    invoice_number: str
    subtotal: float
    tax_amount: float
    total: float
    tax_type: TaxType
    cgst_total: Optional[float] = None
    sgst_total: Optional[float] = None
    igst_total: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Invoice(InvoiceInDBBase):
    items: List[InvoiceItem]
    customer: Optional[Dict[str, Any]] = None
    business_profile: Optional[Dict[str, Any]] = None


# NIC JSON Export/Import Schema
class NICJSONExport(BaseModel):
    invoice_data: Dict[str, Any]


class NICJSONImport(BaseModel):
    json_data: Dict[str, Any] 