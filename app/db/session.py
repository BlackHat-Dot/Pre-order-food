from __future__ import annotations

import logging
import ssl
from collections.abc import AsyncGenerator

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Database URL Normalization
# ─────────────────────────────────────────────────────────────

def _normalize_database_url(
    url: str,
) -> tuple[str, dict]:

    value = (
        url.strip()
        .strip('"')
        .strip("'")
    )

    connect_args: dict = {}

    if value.startswith("postgres://"):
        value = value.replace(
            "postgres://",
            "postgresql+asyncpg://",
            1,
        )

    elif (
        value.startswith(
            "postgresql://"
        )
        and "asyncpg" not in value
    ):
        value = value.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1,
        )

    if value.startswith(
        "postgresql"
    ):
        from urllib.parse import (
            parse_qs,
            urlencode,
            urlparse,
            urlunparse,
        )

        parsed = urlparse(value)

        qs = parse_qs(
            parsed.query,
            keep_blank_values=True,
        )

        sslmode = qs.pop(
            "sslmode",
            [None],
        )[0]

        if sslmode:
            sslmode = sslmode.lower()

            if sslmode == "disable":
                connect_args["ssl"] = False

            else:
                ssl_context = (
                    ssl.create_default_context()
                )

                if sslmode in {
                    "require",
                    "allow",
                    "prefer",
                }:
                    ssl_context.check_hostname = (
                        False
                    )

                    ssl_context.verify_mode = (
                        ssl.CERT_NONE
                    )

                    connect_args["ssl"] = (
                        ssl_context
                    )

                elif sslmode == "verify-ca":
                    ssl_context.verify_mode = (
                        ssl.CERT_REQUIRED
                    )

                    connect_args["ssl"] = (
                        ssl_context
                    )

                elif (
                    sslmode
                    == "verify-full"
                ):
                    connect_args["ssl"] = (
                        ssl_context
                    )

                else:
                    ssl_context.check_hostname = (
                        False
                    )

                    ssl_context.verify_mode = (
                        ssl.CERT_NONE
                    )

                    connect_args["ssl"] = (
                        ssl_context
                    )

        else:
            if (
                parsed.hostname
                and parsed.hostname
                not in {
                    "127.0.0.1",
                    "localhost",
                    "::1",
                }
            ):
                ssl_context = (
                    ssl.create_default_context()
                )

                ssl_context.check_hostname = (
                    False
                )

                ssl_context.verify_mode = (
                    ssl.CERT_NONE
                )

                connect_args["ssl"] = (
                    ssl_context
                )

            else:
                connect_args["ssl"] = False

        new_query = urlencode({
            key: value[0]
            for key, value in qs.items()
        })

        value = urlunparse(
            parsed._replace(
                query=new_query
            )
        )

    return value, connect_args


# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────

database_url, connect_args = (
    _normalize_database_url(
        settings.DATABASE_URL
    )
)

logger.info(
    (
        "Creating async engine "
        "database=%s"
    ),
    database_url[:50],
)

engine = create_async_engine(
    database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args,
    poolclass=NullPool,
)

AsyncSessionLocal = (
    async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
)


async def get_db(
) -> AsyncGenerator[
    AsyncSession,
    None,
]:
    async with AsyncSessionLocal() as session:
        yield session


# ─────────────────────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────────────────────

redis_client: Redis | None = None


async def connect_redis() -> None:
    global redis_client

    redis_url = getattr(
        settings,
        "REDIS_URL",
        None,
    )

    if not redis_url:
        logger.warning(
            "REDIS_URL not configured"
        )

        return

    try:
        redis_client = Redis.from_url(
            redis_url,
            decode_responses=True,
        )

        await redis_client.ping()

        logger.info(
            "Redis connected"
        )

    except Exception as exc:
        redis_client = None

        logger.exception(
            (
                "Redis connection failed: %s"
            ),
            exc,
        )


async def disconnect_redis() -> None:
    global redis_client

    if redis_client is not None:
        await redis_client.close()

        logger.info(
            "Redis disconnected"
        )

    redis_client = None


async def get_redis(
) -> Redis | None:
    return redis_client