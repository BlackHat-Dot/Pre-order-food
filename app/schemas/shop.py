from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class ShopCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    phone: str
    description: str | None = None
    address_line: str
    city: str
    state: str
    pincode: str = Field(min_length=4, max_length=12)
    category: str
    opening_hours: str | None = None


class ShopUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = None
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = Field(default=None, min_length=4, max_length=12)
    category: str | None = None
    opening_hours: str | None = None
    is_open: bool | None = None
    is_accepting_orders: bool | None = None


class ShopOut(BaseModel):
    id: str
    owner_id: str
    name: str
    phone: str
    description: str | None
    address_line: str
    city: str
    state: str
    pincode: str
    category: str
    opening_hours: str | None
    image_url: str | None
    is_open: bool
    is_accepting_orders: bool
    is_verified: bool
    is_active: bool
    rating_avg: float
    rating_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ShopStatusUpdate(BaseModel):
    is_open: bool
    is_accepting_orders: bool

