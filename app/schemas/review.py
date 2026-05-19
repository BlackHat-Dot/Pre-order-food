from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ReviewCreate(BaseModel):
    # 👇 UPDATED: Changed to str | None = None so organic shop profile reviews can skip providing an order_id token!
    order_id: str | None = None
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

    # 👇 FIXED: Kept ONLY the explicit, modern Pydantic V2 configuration. Removed duplicate/conflicting configurations.
    model_config = ConfigDict(from_attributes=True)