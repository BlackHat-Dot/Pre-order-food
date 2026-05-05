from __future__ import annotations

import sys
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def fix_database_url(url: str) -> str:
    """Convert Railway PostgreSQL URL to asyncpg format."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


try:
    database_url = fix_database_url(settings.DATABASE_URL)
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    engine = create_async_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
except Exception as e:
    print(f"❌ Database connection error: {e}")
    print(f"DATABASE_URL value: {settings.DATABASE_URL if settings.DATABASE_URL else 'NOT SET'}")
    sys.exit(1)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

