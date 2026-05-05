from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENV: str = "local"
    APP_NAME: str = "PreOrder Food API"
    API_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    DATABASE_URL: str = "sqlite+aiosqlite:///./data/preorder.db"
    REDIS_URL: str = "redis://redis:6379/0"

    SENTRY_DSN: str | None = None

    AWS_REGION: str | None = None
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET: str | None = None
    S3_PUBLIC_BASE_URL: str | None = None

    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None

    RAZORPAY_KEY_ID: str | None = None
    RAZORPAY_KEY_SECRET: str | None = None


settings = Settings()

