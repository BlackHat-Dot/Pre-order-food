from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.utils.ids import new_id


class Shop(Base):
    __tablename__ = "shops"

    __table_args__ = (
        Index(
            "ix_shops_owner_id",
            "owner_id",
        ),
        Index(
            (
                "ix_shops_city_"
                "category"
            ),
            "city",
            "category",
        ),
        Index(
            (
                "ix_shops_active_"
                "verified"
            ),
            "is_active",
            "is_verified",
        ),
        Index(
            (
                "ix_shops_open_"
                "accepting"
            ),
            "is_open",
            "is_accepting_orders",
        ),
        Index(
            (
                "ix_shops_rating_avg"
            ),
            "rating_avg",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
        index=True,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    description: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    address_line: Mapped[
        str
    ] = mapped_column(
        String(255),
        nullable=False,
    )

    city: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    state: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
    )

    pincode: Mapped[str] = mapped_column(
        String(12),
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        index=True,
    )

    opening_hours: Mapped[
        str | None
    ] = mapped_column(
        String(120),
        nullable=True,
    )

    image_url: Mapped[
        str | None
    ] = mapped_column(
        String(500),
        nullable=True,
    )

    loyalty_discount_per_point: Mapped[
        float
    ] = mapped_column(
        Float,
        nullable=False,
        server_default=text(
            "0.1"
        ),
    )

    is_open: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "false"
        ),
    )

    is_accepting_orders: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "true"
        ),
    )

    is_verified: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "false"
        ),
    )

    is_active: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "true"
        ),
    )

    rating_avg: Mapped[
        float
    ] = mapped_column(
        Float,
        nullable=False,
        server_default=text("0"),
    )

    rating_count: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(
            timezone.utc
        ),
    )

    updated_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(
            timezone.utc
        ),
        onupdate=lambda: datetime.now(
            timezone.utc
        ),
    )

    owner = relationship(
        "User",
    )

    items = relationship(
        "MenuItem",
        back_populates="shop",
        cascade=(
            "all, delete-orphan"
        ),
    )

    orders = relationship(
        "Order",
        back_populates="shop",
    )