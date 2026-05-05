from __future__ import annotations

from pydantic import BaseModel, Field


class Pagination(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class MessageResponse(BaseModel):
    message: str

