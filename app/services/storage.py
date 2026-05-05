from __future__ import annotations

from app.core.config import settings


def build_public_url(key: str) -> str:
    if settings.S3_PUBLIC_BASE_URL:
        return f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{key}"
    if settings.S3_BUCKET and settings.AWS_REGION:
        return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    return f"https://mock-s3.local/{key}"

