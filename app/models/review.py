from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.utils.ids import new_id


class Review(Base):
    __tablename__ = "reviews"

    __table_args__ = (
        UniqueConstraint(
            "order_id",
            "customer_id",
            name=(
                "uq_reviews_"
                "order_customer"
            ),
        ),
        Index(
            (
                "ix_reviews_"
                "shop_created"
            ),
            "shop_id",
            "created_at",
        ),
        Index(
            (
                "ix_reviews_"
                "customer_created"
            ),
            "customer_id",
            "created_at",
        ),
        Index(
            (
                "ix_reviews_rating"
            ),
            "rating",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    order_id: Mapped[
        str | None
    ] = mapped_column(
        String(36),
        ForeignKey(
            "orders.id",
            ondelete="CASCADE",
        ),
        nullable=True,
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

    customer_id: Mapped[
        str
    ] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    comment: Mapped[
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

    customer = relationship(
        "User",
    )

    shop = relationship(
        "Shop",
    )

    order = relationship(
        "Order",
    )

    @property
    def customer_name(
        self,
    ) -> str | None:

        if not self.customer:
            return None

        return self.customer.name