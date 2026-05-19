from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class ReviewCreate(BaseModel):
    order_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewOut(BaseModel):
    id: str
    order_id: str | None = None
    shop_id: str
    customer_id: str
    rating: int
    comment: Optional[str] = ""
    created_at: datetime
    customer_name: str | None = None

    model_config = {"from_attributes": True}
    class Config:
        from_attributes = True
