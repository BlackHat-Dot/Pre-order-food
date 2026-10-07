from __future__ import annotations

import logging
import time
from collections import defaultdict
from threading import Lock

import httpx

from app.core.config import settings
from app.utils.phone import normalize_e164

logger = logging.getLogger(__name__)

MSG91_VERIFY_URL = "https://control.msg91.com/api/v5/widget/verifyOtp"

# In-memory rate limiter: identifier -> list of request timestamps
_rate_store: dict[str, list[float]] = defaultdict(list)
_rate_lock = Lock()

RATE_MAX = 10       # max requests
RATE_WINDOW = 60    # per 60 seconds


def check_msg91_rate_limit(identifier: str) -> bool:
    """Return True if the request is allowed, False if rate-limited."""
    now = time.time()
    with _rate_lock:
        events = _rate_store[identifier]
        events = [t for t in events if now - t < RATE_WINDOW]
        _rate_store[identifier] = events
        if len(events) >= RATE_MAX:
            return False
        events.append(now)
        return True


async def verify_msg91_token(access_token: str, phone: str, otp: str = "") -> str:
    """
    Verify a MSG91 widget access_token against the MSG91 API.

    phone: E.164 format with + (e.g. "+919876543210")
    Returns the verified E.164 phone on success.
    Raises ValueError with a user-friendly message on failure.
    """
    normalized = normalize_e164(phone)

    is_prod = (settings.ENV or "").lower() in {"production", "prod"}

    if access_token in {"local_dev", "dev", "mock", "test"} or access_token.startswith("local_"):
        if is_prod:
            logger.warning("[MSG91] Rejected simulated token in production phone=%s", phone)
            raise ValueError("Simulated verification tokens are not permitted in production. Please complete phone OTP verification.")
        logger.info("[MSG91] Trusting verification in development environment for phone=%s", phone)
        return normalized

    if not settings.MSG91_AUTH_KEY:
        if is_prod:
            raise ValueError("Phone verification service is not configured (missing MSG91_AUTH_KEY).")
        logger.warning("[MSG91] MSG91_AUTH_KEY not set — operating in dev mode.")
        return normalized

    try:
        verify_payload = {
            "widgetId": settings.MSG91_WIDGET_ID,
            "tokenAuth": settings.MSG91_AUTH_KEY,
            "req_id": access_token,
        }
        if otp:
            verify_payload["otp"] = otp

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                MSG91_VERIFY_URL,
                json=verify_payload,
                headers={"authkey": settings.MSG91_AUTH_KEY},
            )
            logger.info("MSG91 verifyOtp status=%s response=%s", resp.status_code, resp.text)
    
    except httpx.TimeoutException as exc:
        logger.error("[MSG91] API timeout: %s", exc)
        raise ValueError("Phone verification service timed out. Please try again.") from exc
    except Exception as exc:
        logger.error("[MSG91] API request failed: %s", exc)
        raise ValueError("Phone verification service unavailable. Please try again.") from exc

    try:
        data = resp.json()
    except Exception:
        logger.error("[MSG91] Non-JSON response: status=%s body=%s", resp.status_code, resp.text[:200])
        raise ValueError("Unexpected response from verification service.")

    if data.get("type") != "success":
        msg = data.get("message") or "Verification failed."
        logger.warning("[MSG91] Verification rejected: %s", data)
        raise ValueError(str(msg))

    status = str(data.get("message", "")).lower()

    if "verified" not in status:
        raise ValueError(data.get("message") or "OTP verification failed.")

    verified_e164 = normalized

    return verified_e164
