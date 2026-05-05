from __future__ import annotations

import sys
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


try:
    connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
except Exception as e:
    print(f"❌ Database connection error: {e}")
    print(f"DATABASE_URL value: {settings.DATABASE_URL if settings.DATABASE_URL else 'NOT SET'}")
    sys.exit(1)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

