from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.db.session import database_url


SCHEMA_PATCHES: dict[str, tuple[str, ...]] = {
    "users": (
        "ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0",
    ),
    "shops": (
        "ALTER TABLE shops ADD COLUMN loyalty_discount_per_point FLOAT NOT NULL DEFAULT 0.1",
    ),
    "orders": (
        "ALTER TABLE orders ADD COLUMN loyalty_points_used INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN loyalty_discount_amount FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE orders ADD COLUMN loyalty_points_earned INTEGER NOT NULL DEFAULT 0",
    ),
}

SCHEMA_CREATE_STATEMENTS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS otp_challenges (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        channel VARCHAR(16) NOT NULL,
        target VARCHAR(255) NOT NULL,
        code_hash VARCHAR(128) NOT NULL,
        purpose VARCHAR(32) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        consumed_at DATETIME NULL,
        resend_count INTEGER NOT NULL DEFAULT 0
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_users_created_at ON users (created_at)",
    "CREATE INDEX IF NOT EXISTS ix_otp_challenges_channel_target ON otp_challenges (channel, target)",
    "CREATE INDEX IF NOT EXISTS ix_otp_challenges_expires_at ON otp_challenges (expires_at)",
)


async def ensure_sqlite_schema_compatibility(engine: AsyncEngine) -> None:
    if not database_url.startswith("sqlite"):
        return

    async with engine.begin() as conn:
        for table_name, alter_statements in SCHEMA_PATCHES.items():
            result = await conn.execute(text(f"PRAGMA table_info({table_name})"))
            existing_columns = {row[1] for row in result.fetchall()}
            for statement in alter_statements:
                column_name = statement.split(" ADD COLUMN ", 1)[1].split(" ", 1)[0].strip()
                if column_name not in existing_columns:
                    await conn.execute(text(statement))

        for statement in SCHEMA_CREATE_STATEMENTS:
            await conn.execute(text(statement))
