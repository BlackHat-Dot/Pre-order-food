from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _normalize_database_url(url: str) -> str:
    value = url.strip().strip('"').strip("'")
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    return value


database_url = _normalize_database_url(settings.DATABASE_URL)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

if database_url.startswith("sqlite+aiosqlite:///"):
    sqlite_path = database_url.replace("sqlite+aiosqlite:///", "", 1)
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

