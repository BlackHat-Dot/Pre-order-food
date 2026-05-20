from pydantic import BaseModel
from datetime import datetime

class AddressCreate(BaseModel):
    title: str
    address_line: str
    landmark: str | None = None

class AddressOut(BaseModel):
    id: str
    title: str
    address_line: str
    landmark: str | None
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SetDefaultAddress(BaseModel):
    address_id: str