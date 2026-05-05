from __future__ import annotations

from app.core.config import settings
from app.utils.ids import new_id


async def create_payment_order(amount_inr: float, receipt: str) -> dict:
    amount_paise = int(round(amount_inr * 100))
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        return {
            "provider": "mock",
            "order_id": f"mock_order_{new_id()}",
            "amount": amount_inr,
            "currency": "INR",
            "receipt": receipt,
            "status": "created",
        }

    import razorpay

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    order = client.order.create({"amount": amount_paise, "currency": "INR", "receipt": receipt})
    return {
        "provider": "razorpay",
        "order_id": order["id"],
        "amount": amount_inr,
        "currency": order["currency"],
        "receipt": receipt,
        "status": order.get("status", "created"),
    }

