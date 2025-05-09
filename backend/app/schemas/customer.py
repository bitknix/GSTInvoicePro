from typing import Optional
import re
from pydantic import BaseModel, Field, EmailStr, validator, field_validator, model_validator
from datetime import datetime

from app.utils.validation_utils import validate_gstin, get_state_from_gstin


# Shared properties
class CustomerBase(BaseModel):
    name: str = Field(..., description="Customer name")
    gstin: Optional[str] = Field(None, description="GSTIN of the customer")
    address: str = Field(..., description="Customer address")
    city: str = Field(..., description="City where customer is located")
    state: str = Field(..., description="State/Province where customer is located")
    country: str = Field("India", description="Country where customer is located")
    pincode: str = Field(..., description="Postal/ZIP code")
    email: Optional[EmailStr] = Field(None, description="Customer email")
    phone: Optional[str] = Field(None, description="Customer phone number")
    notes: Optional[str] = Field(None, description="Additional notes about the customer")

    @model_validator(mode='before')
    @classmethod
    def validate_empty_strings(cls, data):
        """Convert empty strings to None for optional fields"""
        if isinstance(data, dict):
            for field in ['gstin', 'email', 'phone', 'notes']:
                if field in data and data[field] == '':
                    data[field] = None
        return data

    @model_validator(mode='after')
    def prepare_customer_data(self):
        """Process customer data to ensure consistency"""
        # Ensure country is properly capitalized to avoid case-sensitivity issues
        if hasattr(self, 'country') and self.country:
            # Standardize country values for better comparison
            standard_countries = {
                'india': 'India', 
                'australia': 'Australia',
                'united states': 'United States',
                'united kingdom': 'United Kingdom'
            }
            lower_country = self.country.lower()
            if lower_country in standard_countries:
                self.country = standard_countries[lower_country]
        
        # Handle GSTIN for foreign customers
        is_foreign = hasattr(self, 'country') and self.country != 'India'
        if is_foreign and (self.gstin is None or self.gstin == ''):
            self.gstin = 'URP'
        
        return self

    @validator('gstin')
    def validate_gstin_format(cls, v, values):
        if v is not None and v and len(v) > 0:
            # Special case for "URP" (foreign customers)
            if v == "URP":
                country = values.get('country', '')
                # Allow URP for any non-Indian customer
                if country == 'India':
                    raise ValueError("URP GSTIN is only valid for foreign customers")
                return v
                
            # For Indian customers, validate GSTIN format
            country = values.get('country', '')
            if country == 'India':
                is_valid, error_message = validate_gstin(v)
                if not is_valid:
                    raise ValueError(error_message)
            # For foreign customers, GSTIN should be "URP"
            else:
                raise ValueError("GSTIN for foreign customers must be 'URP'")
        return v
    
    @validator('pincode')
    def validate_pincode_format(cls, v):
        # Allow various pincode formats, including non-numeric for international
        if not v:
            raise ValueError("Pincode/Postal code is required")
        
        # For India, ensure numeric format
        values = getattr(cls, "_values", {}) or {}
        country = values.get('country', 'India')
        
        if country.lower() == 'india' and not re.match(r'^\d{4,10}$', v):
            raise ValueError("Pincode must be 4-10 digits for Indian addresses")
            
        # For other countries, allow alphanumeric
        return v

    @validator('state', pre=True)
    def validate_state_with_gstin(cls, v, values):
        # If GSTIN is provided and country is India, extract state from it
        gstin = values.get('gstin')
        country = values.get('country', 'India')
        if gstin and not v and country.lower() == 'india':
            state = get_state_from_gstin(gstin)
            if state:
                return state
        return v


# Properties to receive via API on creation
class CustomerCreate(CustomerBase):
    pass


# Properties to receive via API on update
class CustomerUpdate(CustomerBase):
    name: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None


# Properties shared by models stored in DB
class CustomerInDBBase(CustomerBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Additional properties to return via API
class Customer(CustomerInDBBase):
    pass 