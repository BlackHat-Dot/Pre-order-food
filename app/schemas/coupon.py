from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class CouponMint(BaseModel):
    shop_id: str

    email: EmailStr = Field(
        ...,
        description="Recipient email address for the voucher code",
    )

    points: int = Field(
        ge=100,
        le=10000,
        strict=True,
        description=(
            "Loyalty points to redeem (minimum 100)"
        ),
    )


class CouponOut(BaseModel):
    id: str

    code: str

    discount_value: float

    model_config = ConfigDict(
        from_attributes=True,
    )