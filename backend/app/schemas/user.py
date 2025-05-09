from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime

from app.utils.validation_utils import validate_gstin


# Shared properties
class UserBase(BaseModel):
    email: EmailStr = Field(..., description="Email address of the user")
    gstin: Optional[str] = Field(None, description="GSTIN of the user")
    is_active: Optional[bool] = Field(True, description="Is user active")
    is_superuser: Optional[bool] = Field(False, description="Is user a superuser")

    @validator('gstin')
    def validate_gstin_format(cls, v):
        if v is not None:
            is_valid, error_message = validate_gstin(v)
            if not is_valid:
                raise ValueError(error_message)
        return v


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password for the user")


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = Field(None, min_length=8, description="New password for the user")


# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Additional properties to return via API
class User(UserInDBBase):
    pass


# Additional properties stored in DB but not returned by API
class UserInDB(UserInDBBase):
    hashed_password: str 