from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Product identification
    hsn_sac = Column(String, nullable=True, index=True)
    sku = Column(String, nullable=True, index=True)
    is_service = Column(Boolean, default=False, nullable=False)
    
    # Pricing information
    price = Column(Float, nullable=True)
    tax_rate = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    
    # Inventory tracking (optional for future use)
    stock_quantity = Column(Integer, nullable=True)
    low_stock_threshold = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    invoice_items = relationship("InvoiceItem", back_populates="product") 