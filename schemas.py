# schemas.py
from pydantic import BaseModel,field_validator,Field
from typing import List
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

class LoginRequest(BaseModel):
    phone: str
    password: str