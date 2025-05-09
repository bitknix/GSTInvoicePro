from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

from app.utils.validation_utils import validate_hsn_sac


# Shared properties
class ProductBase(BaseModel):
    name: str = Field(..., description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    
    # Product identification
    hsn_sac: Optional[str] = Field(None, description="HSN/SAC code")
    sku: Optional[str] = Field(None, description="Stock Keeping Unit code")
    is_service: bool = Field(False, description="Whether the product is a service (SAC) or good (HSN)")
    
    # Pricing information
    price: Optional[float] = Field(None, ge=0, description="Base price of the product/service")
    tax_rate: float = Field(..., ge=0, description="Tax rate percentage")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    
    # Inventory tracking (optional)
    stock_quantity: Optional[int] = Field(None, ge=0, description="Current quantity in stock")
    low_stock_threshold: Optional[int] = Field(None, ge=0, description="Threshold for low stock warning")

    @validator('hsn_sac')
    def validate_hsn_sac_code(cls, v, values):
        if v is None or v == "":
            return v
            
        is_service = values.get('is_service', False)
        is_valid, error_message = validate_hsn_sac(v, is_service)
        if not is_valid:
            raise ValueError(error_message)
        return v


# Properties to receive via API on creation
class ProductCreate(ProductBase):
    pass


# Properties to receive via API on update
class ProductUpdate(ProductBase):
    name: Optional[str] = None
    description: Optional[str] = None
    hsn_sac: Optional[str] = None
    sku: Optional[str] = None
    is_service: Optional[bool] = None
    price: Optional[float] = None
    tax_rate: Optional[float] = None
    unit: Optional[str] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None


# Properties shared by models stored in DB
class ProductInDBBase(ProductBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Additional properties to return via API
class Product(ProductInDBBase):
    pass 