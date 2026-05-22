from __future__ import annotations

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_POSTGRES_URL = "postgresql://postgres:oMjBkgEMtNWAOLgdTXZyVPZAHuKNyEHE@kodama.proxy.rlwy.net:50298/railway"


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

    DATABASE_URL: str = DEFAULT_POSTGRES_URL
    REDIS_URL: str = "redis://redis:6379/0"

    # OTP: memory (dev) | database (PostgreSQL) | redis
    OTP_STORAGE: str = "database"
    OTP_TTL_SECONDS: int = 120
    OTP_MAX_SENDS_PER_DAY: int = 15
    OTP_RESEND_COOLDOWN_SECONDS: int = 0

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

    # ── MSG91 Phone Verification ──────────────────────────────────────────────
    # MSG91_AUTH_KEY: Server-side auth key used to verify widget access tokens.
    # Obtain from https://control.msg91.com/signin → API Keys.
    # When not set, the system operates in DEV TRUST MODE (DO NOT use in production).
    MSG91_AUTH_KEY: str | None = None

    # ── Resend Email Service ───────────────────────────────────────────────────
    # RESEND_API_KEY: From https://resend.com/api-keys
    # When not set, OTP codes are logged to console (dev mode only).
    RESEND_API_KEY: str | None = None
    # From address shown in delivered emails (must be a verified Resend domain).
    RESEND_FROM_EMAIL: str | None = None

    # ── Admin bootstrap ───────────────────────────────────────────────────────
    ENABLE_ADMIN_SEED: bool = False
    DEFAULT_ADMIN_EMAIL: str | None = None
    DEFAULT_ADMIN_PHONE: str | None = None
    DEFAULT_ADMIN_NAME: str = "PreOrder Admin"
    DEFAULT_ADMIN_PASSWORD: str | None = None

    @model_validator(mode="after")
    def validate_security(self) -> "Settings":
        env = (self.ENV or "local").lower()
        if env in {"production", "prod", "staging"}:
            if self.JWT_SECRET_KEY == "change-me" or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("JWT_SECRET_KEY must be changed and at least 32 characters in production-like environments")

            if self.ENABLE_ADMIN_SEED:
                required = [
                    self.DEFAULT_ADMIN_EMAIL,
                    self.DEFAULT_ADMIN_PHONE,
                    self.DEFAULT_ADMIN_PASSWORD,
                ]
                if not all(required):
                    raise ValueError(
                        "DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PHONE, and DEFAULT_ADMIN_PASSWORD are required when ENABLE_ADMIN_SEED=true"
                    )
        return self


settings = Settings()

print("MSG91_AUTH_KEY:", repr(settings.MSG91_AUTH_KEY))
print("ENV:", repr(settings.ENV))