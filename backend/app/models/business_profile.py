from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    gstin = Column(String, index=True, nullable=False)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    state_code = Column(String, nullable=False)
    pin = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)
    logo_url = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)
    current_invoice_number = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="business_profiles")
    invoices = relationship("Invoice", back_populates="business_profile", cascade="all, delete-orphan") 