from __future__ import annotations

import logging
import time
from collections import defaultdict
from threading import Lock

import httpx

from app.core.config import settings
from app.utils.phone import normalize_e164

logger = logging.getLogger(__name__)

MSG91_VERIFY_URL = "https://api.msg91.com/api/v5/widget/verifyAccessToken"

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


async def verify_msg91_token(access_token: str, phone: str) -> str:
    """
    Verify a MSG91 widget access_token against the MSG91 API.

    phone: E.164 format with + (e.g. "+919876543210")
    Returns the verified E.164 phone on success.
    Raises ValueError with a user-friendly message on failure.
    """
    normalized = normalize_e164(phone)

    if not settings.MSG91_AUTH_KEY:
        # Dev/test mode — skip real API call, trust the submitted phone.
        # DO NOT ship to production without setting MSG91_AUTH_KEY.
        logger.warning(
            "[MSG91] MSG91_AUTH_KEY not set — operating in DEV TRUST MODE. "
            "Phone verification is NOT enforced. Set MSG91_AUTH_KEY in production."
        )
        return normalized

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                MSG91_VERIFY_URL,
                json={
                "access_token": access_token,
                "authkey": settings.MSG91_AUTH_KEY,
                },
            )
            print("MSG91 RESPONSE:", resp.status_code, resp.text)
    
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

    inner = data.get("data") or {}
    mobile: str = str(inner.get("mobileNumber", "")).strip()
    if not mobile:
        raise ValueError("Phone number not returned by verification service.")

    # MSG91 returns mobileNumber without '+', e.g. "919876543210"
    verified_e164 = normalize_e164(mobile)

    # Ensure the verified phone matches what was submitted
    if verified_e164 != normalized:
        logger.warning(
            "[MSG91] Phone mismatch: verified=%s submitted=%s",
            verified_e164,
            normalized,
        )
        raise ValueError("Verified phone does not match the submitted phone number.")

    return verified_e164
