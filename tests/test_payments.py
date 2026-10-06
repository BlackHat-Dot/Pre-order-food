import hmac
import hashlib
from app.services.payments import verify_payment_signature
from app.core.config import settings


def test_verify_mock_payment_signature():
    assert verify_payment_signature(
        provider="mock",
        provider_order_id="mock_order_123",
        provider_payment_id="mock_pay_123",
        signature=None,
    ) is True

    assert verify_payment_signature(
        provider="mock",
        provider_order_id="",
        provider_payment_id="mock_pay_123",
        signature=None,
    ) is False


def test_verify_razorpay_payment_signature():
    secret = settings.RAZORPAY_KEY_SECRET
    if not secret:
        # If no secret configured, test that verification returns False
        assert verify_payment_signature(
            provider="razorpay",
            provider_order_id="order_123",
            provider_payment_id="pay_123",
            signature="some_sig",
        ) is False
    else:
        payload = "order_123|pay_123".encode("utf-8")
        valid_sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        assert verify_payment_signature(
            provider="razorpay",
            provider_order_id="order_123",
            provider_payment_id="pay_123",
            signature=valid_sig,
        ) is True
        assert verify_payment_signature(
            provider="razorpay",
            provider_order_id="order_123",
            provider_payment_id="pay_123",
            signature="invalid_signature",
        ) is False
