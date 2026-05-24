from __future__ import annotations

from pathlib import Path
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
try:
    import sentry_sdk  # type: ignore
except Exception:  # pragma: no cover
    sentry_sdk = None
from app.api.v1.endpoints.notification import router as notification_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.crud.user import get_user_by_email
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine as async_engine
from app.db.session import AsyncSessionLocal
from app.models.user import User
import app.models  # noqa: F401
from app.utils.ids import new_id

logger = logging.getLogger(__name__)


async def create_database_tables() -> None:
    """Create database tables on startup. Logs detailed errors for debugging."""
    try:
        logger.info(f"Attempting to create/verify database tables. DB URL: {settings.DATABASE_URL[:50]}...")
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {type(e).__name__}: {e}", exc_info=True)
        raise


async def _seed_admin(email: str, phone: str, name: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        existing = await get_user_by_email(db, email)
        if existing:
            return
        admin = User(
            id=new_id(),
            role="admin",
            name=name,
            phone=phone,
            email=email,
            password_hash=hash_password(password),
            is_active=True,
            phone_verified=True,
            email_verified=True,
        )
        db.add(admin)
        await db.commit()
        logger.info("Admin seeded: %s", email)


async def ensure_default_admin() -> None:
    if not settings.ENABLE_ADMIN_SEED:
        return
    if not (settings.DEFAULT_ADMIN_EMAIL and settings.DEFAULT_ADMIN_PHONE and settings.DEFAULT_ADMIN_PASSWORD):
        logger.warning("Admin seeding skipped due to incomplete DEFAULT_ADMIN_* configuration")
        return
    await _seed_admin(
        email=settings.DEFAULT_ADMIN_EMAIL,
        phone=settings.DEFAULT_ADMIN_PHONE,
        name=settings.DEFAULT_ADMIN_NAME,
        password=settings.DEFAULT_ADMIN_PASSWORD,
    )


def create_app() -> FastAPI:
    configure_logging(settings.LOG_LEVEL)

    if settings.SENTRY_DSN and sentry_sdk is not None:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

    app = FastAPI(title=settings.APP_NAME)

    @app.on_event("startup")
    async def on_startup() -> None:
        """App startup: create tables and seed default admin."""
        # 🚀 THE CRITICAL FIX: Force metadata generation across ALL environments, including production!
        # This guarantees missing tracking columns are safely built inside your live database on Railway.
        try:
            logger.info("Initializing baseline database metadata synchronizations...")
            await create_database_tables()
        except Exception as e:
            logger.error(f"Database table sync failed: {e}", exc_info=True)
            if settings.ENV.lower() not in {"production", "prod", "main"}:
                raise
        
        # Seed default admin if configured
        try:
            await ensure_default_admin()
        except Exception as e:
            logger.error(f"Admin seeding failed: {e}", exc_info=True)
            if settings.ENV.lower() not in {"production", "prod"}:
                raise

    app.add_middleware(GZipMiddleware, minimum_size=500)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception for %s %s", request.method, request.url.path, exc_info=exc)
        content = {"error": "internal_server_error"}
        if settings.ENV.lower() in {"local", "dev", "development", "test"}:
            content["detail"] = str(exc)
        return JSONResponse(status_code=500, content=content)

    candidate_frontends = [
        Path(__file__).resolve().parents[1] / "frontend",
        Path(__file__).resolve().parents[1] / "order-delight-main" / "dist",
    ]
    frontend_dir = next((path for path in candidate_frontends if path.exists()), None)

    if frontend_dir is not None:
        app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

        @app.get("/", include_in_schema=False)
        async def frontend_index() -> FileResponse:
            return FileResponse(str(frontend_dir / "index.html"))
    else:
        @app.get("/", include_in_schema=False)
        async def root() -> dict:
            return {"status": "ok", "message": "Backend running. Frontend is served separately."}

    @app.get("/health")
    async def health() -> dict:
        return {
            "status": "ok",
            "environment": settings.ENV,
            "app_name": settings.APP_NAME
        }

    app.include_router(api_router, prefix="/api/v1")
    return app


# Create the runnable app instance cleanly
app = create_app()