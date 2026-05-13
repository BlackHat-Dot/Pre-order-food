"""
Resend-powered transactional email service.

When RESEND_API_KEY is not configured the service logs the OTP to the
console (dev trust mode) so local development works without credentials.
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Lazily imported so the server starts even when resend is not installed
_resend = None


def _get_resend():
    global _resend
    if _resend is None:
        try:
            import resend as _r
            _resend = _r
        except ImportError as exc:
            raise RuntimeError("resend package not installed — run: pip install resend") from exc
    return _resend


_HTML_TEMPLATE = """\
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verification — PreOrder</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🍽 PreOrder</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Verify your email</p>
            <p style="margin:0 0 28px;font-size:15px;color:#71717a;line-height:1.6;">
              {greeting}Use the code below to confirm your email address.
              It expires in <strong>{ttl_min} minutes</strong>.
            </p>

            <!-- OTP box -->
            <div style="background:#f9f9f9;border:2px solid #e4e4e7;border-radius:10px;padding:24px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#a1a1aa;letter-spacing:2px;text-transform:uppercase;">Verification code</p>
              <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:10px;color:#18181b;font-family:monospace;">{code}</p>
            </div>

            <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.
              Never share this code with anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #e4e4e7;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              &copy; PreOrder &middot; This is an automated message, please do not reply.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""


async def send_otp_email(
    *,
    to_email: str,
    code: str,
    ttl_seconds: int = 120,
    user_name: str | None = None,
) -> bool:
    """
    Send an OTP verification email.

    Returns True on success.
    In dev mode (no RESEND_API_KEY) logs to console and returns True.
    """
    ttl_min = max(1, round(ttl_seconds / 60))
    greeting = f"Hi {user_name}, " if user_name else ""
    html_body = _HTML_TEMPLATE.format(code=code, ttl_min=ttl_min, greeting=greeting)

    if not settings.RESEND_API_KEY:
        logger.warning(
            "[Email] RESEND_API_KEY not set — DEV MODE. OTP for %s: %s (expires in %ds)",
            to_email, code, ttl_seconds,
        )
        print(f"\n[Email OTP] To: {to_email}  Code: {code}  TTL: {ttl_seconds}s\n", flush=True)
        return True

    try:
        resend = _get_resend()
        resend.api_key = settings.RESEND_API_KEY

        from_addr = settings.RESEND_FROM_EMAIL or "PreOrder <onboarding@resend.dev>"

        resend.Emails.send({
            "from": from_addr,
            "to": [to_email],
            "subject": f"{code} is your PreOrder verification code",
            "html": html_body,
        })
        logger.info("[Email] OTP sent to %s", to_email)
        return True

    except Exception as exc:
        err_str = str(exc)
        # Domain not verified or sending to non-owner with shared domain — fall back
        # to console so dev/staging still works; log a clear actionable message.
        if "domain" in err_str.lower() or "testing emails" in err_str.lower():
            logger.warning(
                "[Email] Resend domain not verified. "
                "Add a verified domain at resend.com/domains and set RESEND_FROM_EMAIL. "
                "Falling back to console — OTP for %s: %s (expires in %ds)",
                to_email, code, ttl_seconds,
            )
            print(f"\n[Email OTP] To: {to_email}  Code: {code}  TTL: {ttl_seconds}s\n", flush=True)
            return True
        logger.error("[Email] Failed to send OTP to %s: %s", to_email, exc)
        return False
