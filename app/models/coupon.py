from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
    )

    code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
    )

    shop_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "shops.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    creator_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    points_spent: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    discount_value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    is_redeemed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    redeemed_by_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    order_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    redeemed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )