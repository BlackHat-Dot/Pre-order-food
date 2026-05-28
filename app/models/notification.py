from __future__ import annotations

from datetime import (
    datetime,
    timezone,
)

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
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


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        Index(
            (
                "ix_notifications_"
                "user_created"
            ),
            "user_id",
            "created_at",
        ),
        Index(
            (
                "ix_notifications_"
                "user_read"
            ),
            "user_id",
            "is_read",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=new_id,
    )

    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )

    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # order_update|loyalty_refund

    is_read: Mapped[bool] = mapped_column(
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