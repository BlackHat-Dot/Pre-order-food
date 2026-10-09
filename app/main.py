from __future__ import annotations

import logging
from pathlib import Path

from fastapi import (
    FastAPI,
    Request,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from fastapi.middleware.gzip import (
    GZipMiddleware,
)
from fastapi.responses import (
    JSONResponse,
)
from sqlalchemy import text

try:
    import sentry_sdk  # type: ignore

except Exception:
    sentry_sdk = None

import app.models  # noqa: F401

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.crud.user import get_user_by_phone
from app.db.base import Base
from app.db.session import (
    AsyncSessionLocal,
    connect_redis,
    disconnect_redis,
    engine as async_engine,
)
from app.models.user import User
from app.utils.ids import new_id

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Database Setup
# ─────────────────────────────────────────────────────────────

async def create_database_tables() -> None:
    try:
        logger.info(
            "Verifying database schema"
        )

        async with async_engine.begin() as conn:
            await conn.run_sync(
                Base.metadata.create_all
            )

            if conn.dialect.name == "postgresql":
                await conn.execute(
                    text("""
                        ALTER TABLE orders
                        ADD COLUMN IF NOT EXISTS
                        is_cancellation_pending
                        BOOLEAN NOT NULL DEFAULT FALSE;
                    """)
                )

                await conn.execute(
                    text("""
                        ALTER TABLE orders
                        ADD COLUMN IF NOT EXISTS
                        cancellation_requests_sent
                        INTEGER NOT NULL DEFAULT 0;
                    """)
                )

                extra_statements = [
                    "CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq START WITH 1001;",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INTEGER UNIQUE DEFAULT nextval('orders_order_number_seq');",
                    "ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT nextval('orders_order_number_seq');",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(30) NOT NULL DEFAULT 'delivery';",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id VARCHAR(255);",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id VARCHAR(36);",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_applied FLOAT NOT NULL DEFAULT 0;",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;",
                    "ALTER TABLE users DROP COLUMN IF EXISTS email_verified CASCADE;",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_encrypted VARCHAR(255);",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
                    "UPDATE shops SET is_verified = TRUE, is_open = TRUE WHERE is_active = TRUE;",
                    "ALTER TABLE shops ALTER COLUMN image_url TYPE TEXT;",
                    "UPDATE shops SET rating_avg = COALESCE((SELECT ROUND(CAST(AVG(rating) AS NUMERIC), 1) FROM reviews WHERE reviews.shop_id = shops.id), 0.0), rating_count = COALESCE((SELECT COUNT(id) FROM reviews WHERE reviews.shop_id = shops.id), 0);",
                ]
                for stmt in extra_statements:
                    await conn.execute(text(stmt))

            elif conn.dialect.name == "sqlite":
                # Ensure users table columns exist in SQLite
                cols_res = await conn.execute(text("PRAGMA table_info(users);"))
                col_names = {row[1] for row in cols_res.fetchall()}
                if "totp_secret_encrypted" not in col_names:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN totp_secret_encrypted VARCHAR(255);"))
                if "totp_enabled" not in col_names:
                    await conn.execute(text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT 0;"))

        logger.info(
            "Database schema ready"
        )

    except Exception as exc:
        logger.exception(
            (
                "Database setup failed: %s"
            ),
            exc,
        )

        raise


# ─────────────────────────────────────────────────────────────
# Admin Seeder
# ─────────────────────────────────────────────────────────────

async def _seed_admin(
    phone: str,
    name: str,
    password: str,
) -> None:
    async with AsyncSessionLocal() as db:
        existing = (
            await get_user_by_phone(
                db,
                phone,
            )
        )

        if existing:
            return

        admin = User(
            id=new_id(),
            role="admin",
            name=name,
            phone=phone,
            password_hash=hash_password(
                password
            ),
            is_active=True,
            phone_verified=True,
        )

        db.add(admin)

        await db.commit()

        logger.info(
            "Default admin seeded"
        )


async def ensure_default_admin(
) -> None:
    if not settings.ENABLE_ADMIN_SEED:
        return

    required = [
        settings.DEFAULT_ADMIN_PHONE,
        settings.DEFAULT_ADMIN_PASSWORD,
    ]

    if not all(required):
        logger.warning(
            (
                "Admin seeding skipped "
                "due to incomplete config"
            )
        )

        return

    await _seed_admin(
        phone=settings.DEFAULT_ADMIN_PHONE,
        name=settings.DEFAULT_ADMIN_NAME,
        password=settings.DEFAULT_ADMIN_PASSWORD,
    )


# ─────────────────────────────────────────────────────────────
# App Factory
# ─────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    configure_logging(
        settings.LOG_LEVEL
    )

    if (
        settings.SENTRY_DSN
        and sentry_sdk is not None
    ):
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            traces_sample_rate=0.1,
        )

    is_prod = settings.ENV.lower() in {"production", "prod", "staging"}

    app = FastAPI(
        title=settings.APP_NAME,
        debug=False if is_prod else settings.DEBUG,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    # ─────────────────────────────────────────
    # Startup
    # ─────────────────────────────────────────

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info(
            "Application startup"
        )

        if is_prod and not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
            logger.warning(
                "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured in %s. "
                "Online card/UPI payments are disabled. Cash on Delivery (COD) and coupon orders remain active.",
                settings.ENV,
            )

        try:
            if is_prod and not settings.REDIS_URL:
                raise RuntimeError("REDIS_URL is strictly required when running in production or staging")
            await connect_redis()

        except Exception as exc:
            if is_prod:
                logger.error("Durable state error: Failed to connect to Redis in %s: %s", settings.ENV, exc)
                raise RuntimeError(f"Redis connection required in {settings.ENV}") from exc
            logger.warning(
                "Redis startup failed: %s. Using in-memory fallback in development mode.",
                exc,
            )

        try:
            await create_database_tables()

        except Exception as exc:
            logger.exception(
                (
                    "Database startup failed: %s"
                ),
                exc,
            )

            if not is_prod:
                raise

        try:
            await ensure_default_admin()

        except Exception as exc:
            logger.exception(
                (
                    "Admin seeding failed: %s"
                ),
                exc,
            )

            if not is_prod:
                raise

    # ─────────────────────────────────────────
    # Shutdown
    # ─────────────────────────────────────────

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info(
            "Application shutdown"
        )

        try:
            await disconnect_redis()

        except Exception as exc:
            logger.exception(
                (
                    "Redis shutdown failed: %s"
                ),
                exc,
            )

        await async_engine.dispose()

    # ─────────────────────────────────────────
    # Middleware
    # ─────────────────────────────────────────

    app.add_middleware(
        GZipMiddleware,
        minimum_size=500,
    )

    # Allowed CORS Origins (strict allowlist, no wildcard subdomains)
    raw_origins = [
        "https://pre-order-food-frontend.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    if hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
        raw_origins.extend([o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()])
    allowed_origins = list(dict.fromkeys(raw_origins))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_and_csrf_middleware(request: Request, call_next):
        # CSRF check: For state-changing requests using cookie authentication
        if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            cookie_token = request.cookies.get("access_token")
            auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
            # If authenticated via cookie alone (no Bearer header)
            if cookie_token and not (auth_header and auth_header.startswith("Bearer ")):
                # 1. Require custom header X-Requested-With
                x_requested_with = request.headers.get("X-Requested-With") or request.headers.get("x-requested-with")
                if not x_requested_with:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF verification failed: missing X-Requested-With header"},
                    )

                # 2. Strict Origin/Referer check
                origin = request.headers.get("Origin") or request.headers.get("origin")
                referer = request.headers.get("Referer") or request.headers.get("referer")
                req_origin = origin or (referer.split("/")[0] + "//" + referer.split("/")[2] if referer and "://" in referer else None)
                if not req_origin:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF verification failed: missing origin or referer"},
                    )
                normalized_origin = req_origin.rstrip("/")
                if not any(normalized_origin == ao.rstrip("/") for ao in allowed_origins):
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF verification failed: untrusted origin"},
                    )

        response = await call_next(request)

        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https:; "
            "style-src 'self' 'unsafe-inline' https:; "
            "img-src 'self' data: https: blob:; "
            "font-src 'self' https: data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        if is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response

    # ─────────────────────────────────────────
    # Global Exception Handler
    # ─────────────────────────────────────────

    @app.exception_handler(
        Exception
    )
    async def unhandled_exception_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        logger.exception(
            (
                "Unhandled exception "
                "%s %s"
            ),
            request.method,
            request.url.path,
            exc_info=exc,
        )

        content = {
            "error": "internal_server_error"
        }

        if not is_prod:
            content["detail"] = str(exc)

        return JSONResponse(
            status_code=500,
            content=content,
        )

    # ─────────────────────────────────────────
    # Root API Endpoint
    # ─────────────────────────────────────────

    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        info = {
            "status": "ok",
            "message": "PreOrder API backend running",
            "health": "/health",
            "api": "/api/v1",
        }
        if not is_prod:
            info["docs"] = "/docs"
        return info

    # ─────────────────────────────────────────
    # Health
    # ─────────────────────────────────────────

    @app.get("/health")
    async def health() -> dict:
        return {
            "status": "ok",
            "environment": (
                settings.ENV
            ),
            "app_name": (
                settings.APP_NAME
            ),
        }

    # ─────────────────────────────────────────
    # API Routes
    # ─────────────────────────────────────────

    app.include_router(
        api_router,
        prefix="/api/v1",
    )

    return app


app = create_app()