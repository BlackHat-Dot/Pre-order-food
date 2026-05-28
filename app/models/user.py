from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    String,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base
from app.utils.ids import new_id


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        Index(
            (
                "ix_users_role_"
                "created"
            ),
            "role",
            "created_at",
        ),
        Index(
            (
                "ix_users_created_at"
            ),
            "created_at",
        ),
        Index(
            (
                "ix_users_active_role"
            ),
            "is_active",
            "role",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )  # UUID string

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )  # customer|shop_owner|admin

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        index=True,
    )

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    email: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )

    password_hash: Mapped[
        str
    ] = mapped_column(
        String(255),
        nullable=False,
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

    phone_verified: Mapped[
        bool
    ] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text(
            "false"
        ),
    )

    email_verified: Mapped[
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