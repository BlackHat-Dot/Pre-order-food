from __future__ import annotations
from datetime import datetime
import html
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

class MenuItemCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str = Field(
        min_length=2,
        max_length=140,
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
    )
    price: float = Field(
        gt=0,
    )
    category: str | None = Field(
        default=None,
        max_length=60,
    )
    dietary_type: str = Field(
        default="veg",
        pattern="^(veg|non_veg|vegan)$",
    )
    prep_time_minutes: int = Field(
        default=15,
        ge=1,
        le=180,
        alias="preparation_time_minutes",
    )
    image_url: HttpUrl | None = None

    @field_validator("name", "description", "category", mode="before")
    @classmethod
    def sanitize_input(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v

class MenuItemUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=140,
    )
    description: str | None = Field(
        default=None,
        max_length=5000,
    )
    price: float | None = Field(
        default=None,
        gt=0,
    )
    category: str | None = Field(
        default=None,
        max_length=60,
    )
    dietary_type: str | None = Field(
        default=None,
        pattern="^(veg|non_veg|vegan)$",
    )
    prep_time_minutes: int | None = Field(
        default=None,
        ge=1,
        le=180,
    )
    image_url: HttpUrl | None = None
    is_available: bool | None = None
    is_featured: bool | None = None

    @field_validator("name", "description", "category", mode="before")
    @classmethod
    def sanitize_input(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v

class VariantCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=60,
    )
    price: float = Field(
        gt=0,
    )
    prep_time_minutes: int = Field(
        ge=1,
        le=180,
    )
    is_available: bool = True

class VariantUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=60,
    )
    price: float | None = Field(
        default=None,
        gt=0,
    )
    prep_time_minutes: int | None = Field(
        default=None,
        ge=1,
        le=180,
    )
    is_available: bool | None = None

class VariantOut(BaseModel):
    id: str
    item_id: str
    name: str
    price: float
    prep_time_minutes: int
    is_available: bool
    created_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )

class MenuItemOut(BaseModel):
    id: str
    shop_id: str
    name: str
    description: str | None
    price: float
    category: str | None
    dietary_type: str
    prep_time_minutes: int
    image_url: str | None
    is_available: bool
    is_featured: bool
    created_at: datetime | None = None
    variants: list[VariantOut] = Field(default_factory=list)

    model_config = ConfigDict(
        from_attributes=True,
    )