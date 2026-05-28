from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base
from app.utils.ids import new_id


class UserAddress(Base):
    __tablename__ = "user_addresses"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
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
        String(50),
        nullable=False,
        default="Home",
    )

    address_line: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    landmark: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    is_default: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )