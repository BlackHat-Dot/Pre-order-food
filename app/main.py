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
    FileResponse,
    JSONResponse,
)
from fastapi.staticfiles import (
    StaticFiles,
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
                "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;",
                "ALTER TABLE users DROP COLUMN IF EXISTS email CASCADE;",
                "ALTER TABLE users DROP COLUMN IF EXISTS email_verified CASCADE;",
                "UPDATE shops SET is_verified = TRUE, is_open = TRUE WHERE is_active = TRUE;",
            ]
            for stmt in extra_statements:
                await conn.execute(text(stmt))

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

    app = FastAPI(
        title=settings.APP_NAME
    )

    # ─────────────────────────────────────────
    # Startup
    # ─────────────────────────────────────────

    @app.on_event("startup")
    async def on_startup() -> None:
        logger.info(
            "Application startup"
        )

        try:
            await connect_redis()

        except Exception as exc:
            logger.exception(
                (
                    "Redis startup failed: %s"
                ),
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

            if settings.ENV.lower() not in {
                "production",
                "prod",
            }:
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

            if settings.ENV.lower() not in {
                "production",
                "prod",
            }:
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
            "error": (
                "internal_server_error"
            )
        }

        if settings.ENV.lower() in {
            "local",
            "dev",
            "development",
            "test",
        }:
            content["detail"] = str(exc)

        return JSONResponse(
            status_code=500,
            content=content,
        )

    # ─────────────────────────────────────────
    # Frontend Hosting
    # ─────────────────────────────────────────

    candidate_frontends = [
        (
            Path(__file__)
            .resolve()
            .parents[1]
            / "frontend-vanilla"
        ),
        (
            Path(__file__)
            .resolve()
            .parents[1]
            / "frontend"
        ),
        (
            Path(__file__)
            .resolve()
            .parents[1]
            / "order-delight-main"
            / "dist"
        ),
    ]

    frontend_dir = next(
        (
            path
            for path in candidate_frontends
            if path.exists()
        ),
        None,
    )

    if frontend_dir is not None:
        app.mount(
            "/static",
            StaticFiles(
                directory=str(
                    frontend_dir
                )
            ),
            name="static",
        )

        css_dir = frontend_dir / "css"
        if css_dir.exists():
            app.mount(
                "/css",
                StaticFiles(
                    directory=str(
                        css_dir
                    )
                ),
                name="css",
            )

        js_dir = frontend_dir / "js"
        if js_dir.exists():
            app.mount(
                "/js",
                StaticFiles(
                    directory=str(
                        js_dir
                    )
                ),
                name="js",
            )

        @app.get(
            "/",
            include_in_schema=False,
        )
        async def frontend_index(
        ) -> FileResponse:
            return FileResponse(
                str(
                    frontend_dir
                    / "index.html"
                )
            )

        @app.get(
            "/{page_name}.html",
            include_in_schema=False,
        )
        async def frontend_page(
            page_name: str,
        ) -> FileResponse:
            target = (
                frontend_dir
                / f"{page_name}.html"
            )
            if target.exists():
                return FileResponse(
                    str(target)
                )
            return FileResponse(
                str(
                    frontend_dir
                    / "index.html"
                )
            )

    else:

        @app.get(
            "/",
            include_in_schema=False,
        )
        async def root() -> dict:
            return {
                "status": "ok",
                "message": (
                    "Backend running"
                ),
            }

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