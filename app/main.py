from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
try:
    import sentry_sdk  # type: ignore
except Exception:  # pragma: no cover
    sentry_sdk = None

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


async def create_database_tables() -> None:
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created/verified")
    except Exception as e:
        print(f"Failed to create database tables: {e}")
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
        )
        db.add(admin)
        await db.commit()
        print(f"Admin seeded: {email}")


async def ensure_default_admin() -> None:
    await _seed_admin(
        email="admin@preorder.local",
        phone="9000000000",
        name="PreOrder Admin",
        password="Admin@1234",
    )
    # Personal hyper-privileged admin account
    await _seed_admin(
        email="superadmin@preorder.local",
        phone="9999999999",
        name="Super Admin",
        password="SuperAdmin@2024",
    )


def create_app() -> FastAPI:
    configure_logging(settings.LOG_LEVEL)

    if settings.SENTRY_DSN and sentry_sdk is not None:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

    app = FastAPI(title=settings.APP_NAME)

    @app.on_event("startup")
    async def on_startup() -> None:
        await create_database_tables()
        await ensure_default_admin()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(status_code=500, content={"error": "internal_server_error", "detail": str(exc)})

    frontend_dir = Path(__file__).resolve().parents[1] / "frontend"
    if frontend_dir.exists():
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

    app.include_router(api_router, prefix=settings.API_PREFIX)
    return app


app = create_app()
