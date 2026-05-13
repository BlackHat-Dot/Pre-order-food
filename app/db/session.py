from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _normalize_database_url(url: str) -> tuple[str, dict]:
    value = url.strip().strip('"').strip("'")
    connect_args: dict = {}

    # Railway and some hosts use postgres:// — normalize for SQLAlchemy asyncpg
    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql+asyncpg://", 1)
    elif value.startswith("postgresql://") and "asyncpg" not in value:
        value = value.replace("postgresql://", "postgresql+asyncpg://", 1)

    if value.startswith("postgresql://") or value.startswith("postgresql+asyncpg://"):
        # asyncpg does not accept sslmode as a query param — move it to connect_args.
        # Default to SSL for remote hosts when sslmode is not explicitly provided.
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
        elif parsed.hostname and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
            connect_args["ssl"] = True

        new_query = urlencode({k: v[0] for k, v in qs.items()})
        value = urlunparse(parsed._replace(query=new_query))

    return value, connect_args


database_url, connect_args = _normalize_database_url(settings.DATABASE_URL)

engine = create_async_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recycle connections every hour
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

