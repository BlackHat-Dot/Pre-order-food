from __future__ import annotations

from sqlalchemy.pool import NullPool

import ssl
import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

from collections.abc import AsyncGenerator

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
            sslmode = sslmode.lower()
            if sslmode == "disable":
                connect_args["ssl"] = False
            else:
                ssl_context = ssl.create_default_context()
                if sslmode in {"require", "allow", "prefer"}:
                    # Require a secure connection, but do not verify self-signed certs.
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE
                    connect_args["ssl"] = ssl_context
                    logger.info(
                        "Using SSL without certificate verification because sslmode=%s", sslmode
                    )
                elif sslmode == "verify-ca":
                    ssl_context.verify_mode = ssl.CERT_REQUIRED
                    connect_args["ssl"] = ssl_context
                    logger.info("Using SSL with CA verification because sslmode=verify-ca")
                elif sslmode == "verify-full":
                    connect_args["ssl"] = ssl_context
                    logger.info("Using SSL with full certificate validation because sslmode=verify-full")
                else:
                    # Fallback to a permissive SSL session for unknown modes.
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE
                    connect_args["ssl"] = ssl_context
                    logger.warning("Unknown sslmode=%s, using SSL with certificate verification disabled", sslmode)
        else:
            # Default SSL behavior based on host
            if parsed.hostname and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                connect_args["ssl"] = ssl_context
                logger.info(f"Using SSL without certificate verification for remote host: {parsed.hostname}")
            else:
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


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session in FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session

