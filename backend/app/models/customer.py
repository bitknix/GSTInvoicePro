from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    gstin = Column(String, index=True, nullable=True)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, nullable=False, server_default=text("'India'"))
    pincode = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    invoices = relationship("Invoice", back_populates="customer") 