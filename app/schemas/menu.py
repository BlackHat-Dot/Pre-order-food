from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    description: str | None = None
    price: float = Field(gt=0)
    category: str
    dietary_type: str = Field(pattern="^(veg|non_veg|vegan)$")
    prep_time_minutes: int = Field(ge=1, le=180)
    image_url: str | None = None


class MenuItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=140)
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    category: str | None = None
    dietary_type: str | None = Field(default=None, pattern="^(veg|non_veg|vegan)$")
    prep_time_minutes: int | None = Field(default=None, ge=1, le=180)
    image_url: str | None = None
    is_available: bool | None = None
    is_featured: bool | None = None


class VariantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    price: float = Field(gt=0)
    prep_time_minutes: int = Field(ge=1, le=180)
    is_available: bool = True


class VariantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    price: float | None = Field(default=None, gt=0)
    prep_time_minutes: int | None = Field(default=None, ge=1, le=180)
    is_available: bool | None = None


class VariantOut(BaseModel):
    id: str
    item_id: str
    name: str
    price: float
    prep_time_minutes: int
    is_available: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MenuItemOut(BaseModel):
    id: str
    shop_id: str
    name: str
    description: str | None
    price: float
    category: str
    dietary_type: str
    prep_time_minutes: int
    image_url: str | None
    is_available: bool
    is_featured: bool
    created_at: datetime
    variants: list[VariantOut] = []

    model_config = {"from_attributes": True}

