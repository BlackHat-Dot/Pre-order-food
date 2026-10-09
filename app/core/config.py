from __future__ import annotations

from pydantic import model_validator
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ─────────────────────────────────────────
    # App
    # ─────────────────────────────────────────

    ENV: str = "local"

    DEBUG: bool = False

    APP_NAME: str = "PreOrder Food API"

    API_PREFIX: str = "/api/v1"

    LOG_LEVEL: str = "INFO"

    FRONTEND_URL: str = (
        "http://localhost:3000"
    )

    # ─────────────────────────────────────────
    # Security
    # ─────────────────────────────────────────

    JWT_SECRET_KEY: str = (
        "change-me"
    )

    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ─────────────────────────────────────────
    # Database
    # ─────────────────────────────────────────

    DATABASE_URL: str = (
        "postgresql+asyncpg://"
        "postgres:postgres@"
        "localhost:5432/app"
    )

    REDIS_URL: str | None = None

    # ─────────────────────────────────────────
    # OTP
    # ─────────────────────────────────────────

    OTP_STORAGE: str = (
        "database"
    )

    OTP_TTL_SECONDS: int = 120

    OTP_MAX_SENDS_PER_DAY: int = 15

    OTP_RESEND_COOLDOWN_SECONDS: int = 0

    # ─────────────────────────────────────────
    # Monitoring
    # ─────────────────────────────────────────

    SENTRY_DSN: str | None = None

    # ─────────────────────────────────────────
    # AWS / S3
    # ─────────────────────────────────────────

    AWS_REGION: str | None = None

    AWS_ACCESS_KEY_ID: str | None = None

    AWS_SECRET_ACCESS_KEY: str | None = None

    S3_BUCKET: str | None = None

    S3_PUBLIC_BASE_URL: str | None = None

    # ─────────────────────────────────────────
    # Twilio
    # ─────────────────────────────────────────

    TWILIO_ACCOUNT_SID: str | None = None

    TWILIO_AUTH_TOKEN: str | None = None

    TWILIO_FROM_NUMBER: str | None = None

    # ─────────────────────────────────────────
    # Razorpay
    # ─────────────────────────────────────────

    RAZORPAY_KEY_ID: str | None = None

    RAZORPAY_KEY_SECRET: str | None = None

    # ─────────────────────────────────────────
    # MSG91
    # ─────────────────────────────────────────

    MSG91_AUTH_KEY: str | None = None

    # ─────────────────────────────────────────
    # Firebase
    # ─────────────────────────────────────────

    FIREBASE_API_KEY: str | None = None

    FIREBASE_PROJECT_ID: str | None = None

    ENVIRONMENT: str | None = None

    # ─────────────────────────────────────────
    # Privilege & Security Gates
    # ─────────────────────────────────────────

    ADMIN_SECRET: str | None = None

    OWNER_SECRET: str | None = None

    TOTP_ENCRYPTION_KEY: str | None = None

    RAZORPAY_WEBHOOK_SECRET: str | None = None

    CORS_ORIGINS: str = (
        "https://pre-order-food-frontend.vercel.app,"
        "http://localhost:5173,"
        "http://localhost:3000"
    )

    COOKIE_SECURE: bool = False

    # ─────────────────────────────────────────
    # Resend
    # ─────────────────────────────────────────

    RESEND_API_KEY: str | None = None

    RESEND_FROM_EMAIL: str | None = None

    # ─────────────────────────────────────────
    # Admin Bootstrap
    # ─────────────────────────────────────────

    ENABLE_ADMIN_SEED: bool = False

    DEFAULT_ADMIN_PHONE: str | None = None

    DEFAULT_ADMIN_NAME: str = "PreOrder Admin"

    DEFAULT_ADMIN_PASSWORD: str | None = None

    # ─────────────────────────────────────────
    # Validation
    # ─────────────────────────────────────────

    @model_validator(mode="after")
    def validate_security(
        self,
    ) -> "Settings":

        env = (
            self.ENVIRONMENT or self.ENV or "local"
        ).lower()
        self.ENV = env
        self.ENVIRONMENT = env

        if env in {
            "production",
            "prod",
            "staging",
        }:
            self.DEBUG = False
            self.COOKIE_SECURE = True

            if (
                self.JWT_SECRET_KEY == "change-me"
                or len(self.JWT_SECRET_KEY) < 32
            ):
                raise ValueError(
                    "JWT_SECRET_KEY must be changed and contain at least 32 characters in production"
                )

            if not self.REDIS_URL or not self.REDIS_URL.strip():
                raise ValueError(
                    "REDIS_URL is strictly required when running in production or staging"
                )

            if not self.RAZORPAY_KEY_ID or not self.RAZORPAY_KEY_SECRET:
                raise ValueError(
                    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are strictly required in production or staging"
                )

            if self.ENABLE_ADMIN_SEED:
                if not self.DEFAULT_ADMIN_PASSWORD or self.DEFAULT_ADMIN_PASSWORD == "AdminPassword123!":
                    raise ValueError(
                        "A secure, non-default DEFAULT_ADMIN_PASSWORD is required when ENABLE_ADMIN_SEED=true"
                    )
                if not self.DEFAULT_ADMIN_PHONE:
                    raise ValueError(
                        "DEFAULT_ADMIN_PHONE is required when ENABLE_ADMIN_SEED=true"
                    )

        return self


settings = Settings()