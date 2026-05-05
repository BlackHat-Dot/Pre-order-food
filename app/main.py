from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
try:
    import sentry_sdk  # type: ignore
except Exception:  # pragma: no cover
    sentry_sdk = None

from app.core.config import settings
from app.core.logging import configure_logging
from app.api.v1.router import api_router
from app.db.base import Base
from app.db.session import engine as async_engine


async def create_database_tables() -> None:
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"❌ Failed to create database tables: {e}")
        raise


def create_app() -> FastAPI:
    configure_logging(settings.LOG_LEVEL)

    if settings.SENTRY_DSN and sentry_sdk is not None:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

    app = FastAPI(title=settings.APP_NAME)

    @app.on_event("startup")
    async def on_startup() -> None:
        await create_database_tables()

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

