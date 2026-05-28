from __future__ import annotations

import hashlib
import hmac

import razorpay

from app.core.config import settings
from app.utils.ids import new_id


# ─────────────────────────────────────────────────────────────
# Create Payment Order
# ─────────────────────────────────────────────────────────────

async def create_payment_order(
    amount_inr: float,
    receipt: str,
) -> dict:

    amount_inr = round(
        float(amount_inr),
        2,
    )

    if amount_inr <= 0:
        raise ValueError(
            "Amount must be greater than 0"
        )

    amount_paise = int(
        amount_inr * 100
    )

    if not (
        settings.RAZORPAY_KEY_ID
        and settings.RAZORPAY_KEY_SECRET
    ):
        return {
            "provider": "mock",
            "order_id": (
                f"mock_order_{new_id()}"
            ),
            "amount": amount_inr,
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
        }

    client = razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        )
    )

    order = client.order.create(
        {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
        }
    )

    return {
        "provider": "razorpay",
        "order_id": order["id"],
        "amount": amount_inr,
        "currency": (
            order.get(
                "currency",
                "INR",
            )
        ),
        "receipt": receipt,
        "status": (
            order.get(
                "status",
                "created",
            )
        ),
    }


# ─────────────────────────────────────────────────────────────
# Verify Payment Signature
# ─────────────────────────────────────────────────────────────

def verify_payment_signature(
    provider: str,
    provider_order_id: str,
    provider_payment_id: str,
    signature: str | None,
) -> bool:

    provider = (
        provider.lower().strip()
    )

    if provider == "mock":
        return bool(
            provider_order_id
            and provider_payment_id
        )

    if provider != "razorpay":
        return False

    if not (
        settings.RAZORPAY_KEY_ID
        and settings.RAZORPAY_KEY_SECRET
    ):
        return False

    if not (
        provider_order_id
        and provider_payment_id
        and signature
    ):
        return False

    payload = (
        f"{provider_order_id}|"
        f"{provider_payment_id}"
    ).encode("utf-8")

    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(
            "utf-8"
        ),
        payload,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(
        expected_signature,
        signature,
    )