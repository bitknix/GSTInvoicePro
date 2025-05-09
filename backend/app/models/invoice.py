from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import Base


class TaxType(str, enum.Enum):
    IGST = "IGST"
    CGST_SGST = "CGST_SGST"


class DocumentType(str, enum.Enum):
    INVOICE = "Invoice"
    CREDIT_NOTE = "Credit Note"
    DEBIT_NOTE = "Debit Note"


class SupplyType(str, enum.Enum):
    B2B = "B2B"
    B2C = "B2C"
    EXPORT_WITH_TAX = "Export with Tax"
    EXPORT_WITHOUT_TAX = "Export without Tax"
    SEZ_WITH_TAX = "SEZ with Tax"
    SEZ_WITHOUT_TAX = "SEZ without Tax"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "Draft"
    FINALIZED = "Finalized"
    SENT = "Sent"
    E_INVOICE = "E-Invoice"
    GST_FILED = "GST-Filed" 
    ARCHIVED = "Archived"
    APPROVED = "Approved"  # Adding 'Approved' status for invoices imported with IRN


class PaymentStatus(str, enum.Enum):
    UNPAID = "Unpaid"
    PARTIAL = "Partial"
    PAID = "Paid"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, nullable=False, index=True)
    invoice_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    business_profile_id = Column(Integer, ForeignKey("business_profiles.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    tax_type = Column(Enum(TaxType), nullable=False)
    cgst_total = Column(Float, nullable=True)
    sgst_total = Column(Float, nullable=True)
    igst_total = Column(Float, nullable=True)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.DRAFT)
    payment_status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.UNPAID)
    
    # New fields
    document_type = Column(Enum(DocumentType), nullable=False, default=DocumentType.INVOICE)
    supply_type = Column(Enum(SupplyType), nullable=False, default=SupplyType.B2B)
    reference_number = Column(String, nullable=True)
    place_of_supply = Column(String, nullable=True)
    dispatch_from = Column(String, nullable=True)
    ship_to = Column(String, nullable=True)
    
    # Export-specific fields
    currency = Column(String, nullable=True, default="INR")
    port_of_export = Column(String, nullable=True)
    
    # Discount
    discount_amount = Column(Float, nullable=True, default=0)
    round_off = Column(Float, nullable=True, default=0)
    
    # E-Invoice fields
    irn = Column(String, nullable=True)  # Invoice Reference Number
    ack_no = Column(String, nullable=True)  # Acknowledgement Number
    ack_date = Column(String, nullable=True)  # Acknowledgement Date
    signed_invoice = Column(String, nullable=True)  # Signed Invoice JWT token
    qr_code = Column(String, nullable=True)  # QR Code data
    
    # E-way bill fields
    ewb_no = Column(String, nullable=True)  # E-way Bill Number
    ewb_date = Column(String, nullable=True)  # E-way Bill Date
    ewb_valid_till = Column(String, nullable=True)  # E-way Bill Validity
    
    # Import flag
    is_imported = Column(Boolean, nullable=True, default=False)  # Flag to indicate imported invoices
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    business_profile = relationship("BusinessProfile", back_populates="invoices", lazy="joined")
    customer = relationship("Customer", back_populates="invoices", lazy="joined")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    rate = Column(Float, nullable=False)
    tax_rate = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    cgst = Column(Float, nullable=True)
    sgst = Column(Float, nullable=True)
    igst = Column(Float, nullable=True)
    tax_type = Column(Enum(TaxType), nullable=False)
    
    # New fields
    hsn_sac = Column(String, nullable=True)  # HSN/SAC code
    description = Column(String, nullable=True)
    discount_percent = Column(Float, nullable=True, default=0)
    discount_amount = Column(Float, nullable=True, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", back_populates="invoice_items") 