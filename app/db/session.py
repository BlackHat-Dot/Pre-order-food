from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _normalize_database_url(url: str) -> tuple[str, dict]:
    value = url.strip().strip('"').strip("'")
    connect_args: dict = {}

    if value.startswith("postgresql://") or value.startswith("postgresql+asyncpg://"):
        # Convert plain postgresql:// to asyncpg driver
        if value.startswith("postgresql://"):
            value = value.replace("postgresql://", "postgresql+asyncpg://", 1)

        # asyncpg does not accept sslmode as a query param — move it to connect_args
        from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
        parsed = urlparse(value)
        qs = parse_qs(parsed.query, keep_blank_values=True)
        sslmode = qs.pop("sslmode", [None])[0]
        if sslmode:
            ssl_map = {
                "disable": False,
                "allow": False,
                "prefer": False,
                "require": True,
                "verify-ca": True,
                "verify-full": True,
            }
            connect_args["ssl"] = ssl_map.get(sslmode, False)
        new_query = urlencode({k: v[0] for k, v in qs.items()})
        value = urlunparse(parsed._replace(query=new_query))

    elif value.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    return value, connect_args


database_url, connect_args = _normalize_database_url(settings.DATABASE_URL)

if database_url.startswith("sqlite+aiosqlite:///"):
    sqlite_path = database_url.replace("sqlite+aiosqlite:///", "", 1)
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

