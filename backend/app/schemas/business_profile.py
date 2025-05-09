from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime


# Shared properties
class BusinessProfileBase(BaseModel):
    name: str = Field(..., description="Business name")
    gstin: str = Field(..., min_length=15, max_length=15, description="GSTIN of the business")
    address: str = Field(..., description="Business address")
    city: str = Field(..., description="City")
    state: str = Field(..., description="State where business is registered")
    state_code: str = Field(..., min_length=2, max_length=2, description="State code (2 digits)")
    pin: str = Field(..., min_length=6, max_length=6, description="PIN code (6 digits)")
    phone: str = Field(..., min_length=10, max_length=10, description="Business phone number")
    email: EmailStr = Field(..., description="Business email")
    logo_url: Optional[str] = Field(None, description="URL to business logo")
    is_default: Optional[bool] = Field(False, description="Whether this is the default business profile")


# Properties to receive via API on creation
class BusinessProfileCreate(BusinessProfileBase):
    pass


# Properties to receive via API on update
class BusinessProfileUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    is_default: Optional[bool] = None


# Properties shared by models stored in DB
class BusinessProfileInDBBase(BusinessProfileBase):
    id: int
    user_id: int
    current_invoice_number: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Additional properties to return via API
class BusinessProfile(BusinessProfileInDBBase):
    pass 