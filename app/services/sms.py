from __future__ import annotations

from app.core.config import settings
from app.core.logging import logger


async def send_sms(to_phone: str, body: str) -> dict:
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
        logger.info("sms_mock_sent", to=to_phone, body=body)
        return {"provider": "mock", "status": "sent"}

    from twilio.rest import Client

    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    msg = client.messages.create(
        from_=settings.TWILIO_FROM_NUMBER,
        to=to_phone,
        body=body,
    )
    return {"provider": "twilio", "status": msg.status, "sid": msg.sid}

