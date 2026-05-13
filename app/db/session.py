from __future__ import annotations

from sqlalchemy.pool import NullPool

import ssl
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

logger = logging.getLogger(__name__)


def _normalize_database_url(url: str) -> tuple[str, dict]:
    """
    Normalize DATABASE_URL for asyncpg and configure SSL properly.
    
    Handles:
    - postgres:// -> postgresql+asyncpg://
    - SSL certificate verification (Railway uses self-signed certs)
    - Connection string parsing
    """
    value = url.strip().strip('"').strip("'")
    connect_args: dict = {}

    # Railway and some hosts use postgres:// — normalize for SQLAlchemy asyncpg
    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql+asyncpg://", 1)
    elif value.startswith("postgresql://") and "asyncpg" not in value:
        value = value.replace("postgresql://", "postgresql+asyncpg://", 1)

    if value.startswith("postgresql://") or value.startswith("postgresql+asyncpg://"):
        from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

        parsed = urlparse(value)
        qs = parse_qs(parsed.query, keep_blank_values=True)
        sslmode = qs.pop("sslmode", [None])[0]

        # Handle sslmode parameter
        if sslmode:
            ssl_mode_map = {
                "disable": False,
                "allow": False,
                "prefer": False,
                "require": True,
                "verify-ca": "verify-ca",
                "verify-full": "verify-full",
            }
            ssl_setting = ssl_mode_map.get(sslmode, True)
            
            if ssl_setting is True or ssl_setting == "verify-full":
                # Standard SSL with certificate verification
                connect_args["ssl"] = True
            elif ssl_setting == "verify-ca":
                # Verify CA only
                connect_args["ssl"] = "verify-ca"
            elif ssl_setting is False:
                # No SSL
                connect_args["ssl"] = False
        else:
            # Default SSL behavior based on host
            if parsed.hostname and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
                # For remote hosts (e.g., Railway), use SSL but don't verify certs (self-signed)
                # This is safe for Railway's private/internal connections
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                connect_args["ssl"] = ssl_context
                logger.info(f"Using SSL without certificate verification for remote host: {parsed.hostname}")
            else:
                # Local connections don't need SSL
                connect_args["ssl"] = False

        # Remove sslmode from query string
        new_query = urlencode({k: v[0] for k, v in qs.items()})
        value = urlunparse(parsed._replace(query=new_query))

    return value, connect_args


database_url, connect_args = _normalize_database_url(settings.DATABASE_URL)

logger.info(f"Creating async engine with URL pattern: {database_url[:50]}... SSL: {type(connect_args.get('ssl', 'default'))}")

engine = create_async_engine(
    database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args,
    poolclass=NullPool
)
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncSession:
    """Dependency for getting database session in FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session

