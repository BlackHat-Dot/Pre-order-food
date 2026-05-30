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


class Order(Base):
    __tablename__ = "orders"

    __table_args__ = (
        Index(
            (
                "ix_orders_customer_"
                "created"
            ),
            "customer_id",
            "created_at",
        ),
        Index(
            (
                "ix_orders_shop_status"
            ),
            "shop_id",
            "status",
        ),
        Index(
            (
                "ix_orders_payment_"
                "created"
            ),
            "payment_status",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )
    
    order_number: Mapped[int] = mapped_column(
                  Integer,
            unique=True,
            nullable=False,
            index=True,
    )

    customer_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
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

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text(
            "'pending'"
        ),
        index=True,
    )

    total_price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    prep_time_minutes: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
    )

    scheduled_at: Mapped[
        datetime | None
    ] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    instructions: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    payment_method: Mapped[
        str
    ] = mapped_column(
        String(30),
        nullable=False,
        server_default=text(
            "'cod'"
        ),
    )  # cod|online|coupon

    payment_status: Mapped[
        str
    ] = mapped_column(
        String(20),
        nullable=False,
        server_default=text(
            "'pending'"
        ),
        index=True,
    )  # pending|paid

    order_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text(
            "'delivery'"
        ),
    )  # delivery|table_booking

    delivery_address_id: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
    )

    coupon_id: Mapped[
        str | None
    ] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )

    coupon_discount_applied: Mapped[
        float
    ] = mapped_column(
        Float,
        nullable=False,
        server_default=text("0"),
    )

    loyalty_points_used: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    loyalty_discount_amount: Mapped[
        float
    ] = mapped_column(
        Float,
        nullable=False,
        server_default=text("0"),
    )

    loyalty_points_earned: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    redeem_loyalty_points: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    cancellation_reason: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    cancellation_requests_sent: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )

    is_cancellation_pending: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "false"
        ),
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

    shop = relationship(
        "Shop",
        back_populates="orders",
    )

    customer = relationship(
        "User",
    )

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade=(
            "all, delete-orphan"
        ),
    )

    payments = relationship(
        "Payment",
        back_populates="order",
        cascade=(
            "all, delete-orphan"
        ),
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    __table_args__ = (
        Index(
            "ix_order_items_order_id",
            "order_id",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    item_id: Mapped[
        str | None
    ] = mapped_column(
        String(36),
        ForeignKey(
            "menu_items.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    variant_id: Mapped[
        str | None
    ] = mapped_column(
        String(36),
        ForeignKey(
            "menu_item_variants.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    unit_price: Mapped[
        float
    ] = mapped_column(
        Float,
        nullable=False,
    )

    item_name_snapshot: Mapped[
        str
    ] = mapped_column(
        String(140),
        nullable=False,
    )

    variant_name_snapshot: Mapped[
        str | None
    ] = mapped_column(
        String(60),
        nullable=True,
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

    order = relationship(
        "Order",
        back_populates="items",
    )


class Payment(Base):
    __tablename__ = "payments"

    __table_args__ = (
        Index(
            "ix_payments_order_id",
            "order_id",
        ),
        Index(
            (
                "ix_payments_provider_"
                "payment_id"
            ),
            "provider_payment_id",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    order_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        server_default=text(
            "'razorpay'"
        ),
    )

    provider_order_id: Mapped[
        str | None
    ] = mapped_column(
        String(120),
        nullable=True,
        index=True,
    )

    provider_payment_id: Mapped[
        str | None
    ] = mapped_column(
        String(120),
        nullable=True,
        index=True,
    )

    amount: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        server_default=text(
            "'INR'"
        ),
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text(
            "'created'"
        ),
        index=True,
    )

    raw_payload: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
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

    order = relationship(
        "Order",
        back_populates="payments",
    )