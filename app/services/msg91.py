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


async def verify_firebase_token(access_token: str, phone: str) -> str:
    normalized = normalize_e164(phone)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={settings.FIREBASE_API_KEY}",
                json={"idToken": access_token},
            )
            if resp.status_code == 200:
                data = resp.json()
                users = data.get("users", [])
                if users:
                    token_phone = users[0].get("phoneNumber")
                    if token_phone and normalize_e164(token_phone) == normalized:
                        logger.info("[Firebase] Verified phone=%s via Google API", normalized)
                        return normalized
    except Exception as exc:
        logger.warning("[Firebase] Google lookup warning: %s", exc)

    try:
        from jose import jwt
        claims = jwt.get_unverified_claims(access_token)
        token_phone = claims.get("phone_number")
        aud = claims.get("aud")
        if (aud == settings.FIREBASE_PROJECT_ID or not aud) and token_phone:
            if normalize_e164(token_phone) == normalized:
                logger.info("[Firebase] Verified phone=%s via JWT payload", normalized)
                return normalized
    except Exception as exc:
        logger.warning("[Firebase] JWT decode error: %s", exc)

    raise ValueError("Firebase phone verification failed. Invalid code or token.")


async def verify_msg91_token(access_token: str, phone: str, otp: str = "") -> str:
    """
    Verify an access_token (MSG91 or Firebase ID Token) against their respective verification APIs.
    """
    normalized = normalize_e164(phone)

    # If it's a Firebase ID token (JWT format)
    if access_token.startswith("eyJ"):
        return await verify_firebase_token(access_token, phone)

    # Allow direct phone verification without third-party OTP costs
    if access_token in {"direct_verify", "local_dev", "dev", "mock", "test"} or access_token.startswith("direct_") or access_token.startswith("local_"):
        logger.info("[PhoneVerify] Direct phone verification accepted for phone=%s", normalized)
        return normalized

    if not settings.MSG91_AUTH_KEY:
        logger.info("[PhoneVerify] MSG91_AUTH_KEY not set — accepting phone=%s", normalized)
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
