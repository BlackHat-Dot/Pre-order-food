# schemas.py
from pydantic import BaseModel,field_validator,EmailStr
from typing import List,Optional
from fastapi import HTTPException

class ShopCreate(BaseModel):
    name: str
    phone: str
    password: str
    address: str
    opening_hours: str
    categories: List[str]

    @field_validator("phone")
    def validate_phone(cls, v):
        if not v.isdigit():
            raise HTTPException(status_code=422,detail="Phone number must contain only digits")
        if len(v) != 10:
            raise HTTPException(status_code=422,detail="Phone number must be exactly 10 digits")
        return v

class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str

    @field_validator("phone")
    def validate_phone(cls, v):
        if not v.isdigit():
            raise ValueError("Phone number must contain only digits")
        if len(v) != 10:
            raise ValueError("Phone number must be exactly 10 digits")
        return v

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

class LoginRequest(BaseModel):
    phone: str
    password: str


class CustomerLogin(BaseModel):
    phone: str
    password: str

class AddressCreate(BaseModel):
    line1: str
    line2: str | None = None
    city: str
    state: str
    pincode: str
    is_default: bool = False

    @field_validator("pincode")
    def validate_pincode(cls, v):
        if not v.isdigit() or len(v) != 6:
            raise ValueError("Pincode must be 6 digits")
        return v