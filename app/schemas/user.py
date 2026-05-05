from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    role: str
    name: str
    phone: str
    email: EmailStr | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

