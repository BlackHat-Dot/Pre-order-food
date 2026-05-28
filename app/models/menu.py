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
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.db.base import Base
from app.utils.ids import new_id


class MenuItem(Base):
    __tablename__ = "menu_items"

    __table_args__ = (
        UniqueConstraint(
            "shop_id",
            "name",
            name=(
                "uq_menu_items_"
                "shop_name"
            ),
        ),
        Index(
            "ix_menu_items_shop_id",
            "shop_id",
        ),
        Index(
            (
                "ix_menu_items_"
                "shop_available"
            ),
            "shop_id",
            "is_available",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
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

    name: Mapped[str] = mapped_column(
        String(140),
        nullable=False,
    )

    description: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        index=True,
    )

    dietary_type: Mapped[
        str
    ] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )  # veg|non_veg|vegan

    prep_time_minutes: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
    )

    image_url: Mapped[
        str | None
    ] = mapped_column(
        String(500),
        nullable=True,
    )

    is_available: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "true"
        ),
    )

    is_featured: Mapped[
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
        back_populates="items",
    )

    variants = relationship(
        "MenuItemVariant",
        back_populates="item",
        cascade=(
            "all, delete-orphan"
        ),
    )


class MenuItemVariant(Base):
    __tablename__ = (
        "menu_item_variants"
    )

    __table_args__ = (
        UniqueConstraint(
            "item_id",
            "name",
            name=(
                "uq_menu_item_variants_"
                "item_name"
            ),
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "menu_items.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
    )

    price: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    prep_time_minutes: Mapped[
        int
    ] = mapped_column(
        Integer,
        nullable=False,
    )

    is_available: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "true"
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

    item = relationship(
        "MenuItem",
        back_populates="variants",
    )