from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


class AddressCreate(BaseModel):

    title: str = Field(
        min_length=1,
        max_length=50,
    )

    address_line: str = Field(
        min_length=5,
        max_length=500,
    )

    landmark: str | None = Field(
        default=None,
        max_length=255,
    )


class AddressOut(BaseModel):

    id: str

    title: str

    address_line: str

    landmark: str | None

    is_default: bool

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class SetDefaultAddress(BaseModel):

    address_id: str