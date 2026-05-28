from __future__ import annotations

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
)


class UserOut(
    BaseModel
):

    id: str

    role: str

    name: str

    phone: str

    email: EmailStr | None

    is_active: bool

    phone_verified: bool

    email_verified: bool

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )