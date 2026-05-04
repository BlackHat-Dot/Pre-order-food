# schemas.py
from pydantic import BaseModel,field_validator,EmailStr, HttpUrl
from typing import List,Optional,Literal
from fastapi import HTTPException
from datetime import date

ALLOWED_PREP_TIMES = {5, 10, 15, 20, 25, 30}


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
    
class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: str
    image_url: Optional[HttpUrl] = None
    prep_time: int
    dietary_type: Literal["veg", "non_veg", "vegan"]

    @field_validator("price")
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v
    
    @field_validator("prep_time")
    def validate_prep_time(cls, v):
        if v not in ALLOWED_PREP_TIMES:
            raise ValueError("Invalid prep time")
        return v


class BatchAvailabilityUpdate(BaseModel):
    item_ids: List[int]
    available: bool

    @field_validator("item_ids")
    def validate_ids(cls, v):
        if not v:
            raise ValueError("item_ids cannot be empty")
        if len(set(v)) != len(v):
            raise ValueError("Duplicate item_ids not allowed")
        return v
    
class SetDailySpecial(BaseModel):
    item_ids: List[int]
    special_date: date  # enforce explicit date

class VariantCreate(BaseModel):
    name: str
    price: float
    prep_time: int

    @field_validator("price")
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError("Invalid price")
        return v

class AddVariants(BaseModel):
    variants: List[VariantCreate]

from datetime import datetime
from pydantic_core.core_schema import ValidationInfo

from pydantic import BaseModel, model_validator

class OrderItemInput(BaseModel):
    item_id: Optional[int] = None
    variant_id: Optional[int] = None
    quantity: int

    @model_validator(mode="after")
    def validate_choice(self):
        if not self.item_id and not self.variant_id:
            raise ValueError("Either item_id or variant_id required")

        if self.item_id and self.variant_id:
            raise ValueError("Provide only one of item_id or variant_id")

        if self.quantity <= 0:
            raise ValueError("Quantity must be >= 1")

        return self


class OrderCreate(BaseModel):
    shop_id: int
    items: List[OrderItemInput]
    scheduled_time: Optional[datetime] = None
    payment_method: str
    instructions: Optional[str] = None