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

        print("RESEND_API_KEY:", repr(settings.RESEND_API_KEY))
        print("RESEND_FROM_EMAIL:", repr(settings.RESEND_FROM_EMAIL))

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


_COUPON_HTML_TEMPLATE = """\
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Your voucher for {shop_name}</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
    table, td {{ mso-table-lspace:0pt; mso-table-rspace:0pt; }}
    @media only screen and (max-width:600px) {{
      .container {{ width:100% !important; }}
      .px {{ padding-left:20px !important; padding-right:20px !important; }}
      .code {{ font-size:26px !important; letter-spacing:3px !important; }}
    }}
    @media (prefers-color-scheme: dark) {{
      .bg-page {{ background:#121212 !important; }}
      .bg-card {{ background:#1c1c1e !important; }}
      .text-main {{ color:#f4f4f5 !important; }}
      .text-muted {{ color:#a1a1aa !important; }}
      .code-box {{ background:#262628 !important; border-color:#3f3f46 !important; }}
      .divider {{ border-color:#3f3f46 !important; }}
    }}
  </style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:#f5f5f5;">

  <!-- Preheader (inbox preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f5f5f5;">
    Rs. {discount_value:.2f} off at {shop_name}. Your code: {code}
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <table role="presentation" class="container bg-card" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:8px;">

          <!-- Wordmark -->
          <tr>
            <td class="px" style="padding:28px 40px 20px;border-bottom:1px solid #ececec;" >
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ea580c;letter-spacing:-0.3px;">PreOrder</span>
            </td>
          </tr>

          <!-- Headline + intro -->
          <tr>
            <td class="px" style="padding:32px 40px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <h1 class="text-main" style="margin:0 0 12px;font-size:24px;line-height:32px;font-weight:700;color:#18181b;">
                Your voucher is ready
              </h1>
              <p class="text-main" style="margin:0;font-size:16px;line-height:24px;color:#3f3f46;">
                {greeting}Here is your voucher code for <strong>{shop_name}</strong>.
              </p>
            </td>
          </tr>

          <!-- Code block -->
          <tr>
            <td class="px" style="padding:24px 40px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="code-box" align="center" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:24px 16px;">
                    <div class="text-muted" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#71717a;padding-bottom:8px;">
                      Voucher code
                    </div>
                    <div class="code text-main" style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:32px;line-height:40px;font-weight:700;letter-spacing:5px;color:#18181b;">
                      {code}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td class="px" style="padding:16px 40px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="text-muted divider" style="padding:12px 0;border-bottom:1px solid #ececec;font-size:14px;line-height:20px;color:#71717a;">Restaurant</td>
                  <td class="text-main divider" align="right" style="padding:12px 0;border-bottom:1px solid #ececec;font-size:14px;line-height:20px;font-weight:600;color:#18181b;">{shop_name}</td>
                </tr>
                <tr>
                  <td class="text-muted divider" style="padding:12px 0;border-bottom:1px solid #ececec;font-size:14px;line-height:20px;color:#71717a;">Discount value</td>
                  <td class="text-main divider" align="right" style="padding:12px 0;border-bottom:1px solid #ececec;font-size:14px;line-height:20px;font-weight:600;color:#18181b;">Rs. {discount_value:.2f}</td>
                </tr>
                <tr>
                  <td class="text-muted" style="padding:12px 0;font-size:14px;line-height:20px;color:#71717a;">Applies to</td>
                  <td class="text-main" align="right" style="padding:12px 0;font-size:14px;line-height:20px;font-weight:600;color:#18181b;">Order total</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How to use -->
          <tr>
            <td class="px" style="padding:16px 40px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p class="text-main" style="margin:0 0 6px;font-size:14px;line-height:20px;font-weight:600;color:#18181b;">How to redeem</p>
              <p class="text-muted" style="margin:0;font-size:14px;line-height:22px;color:#52525b;">
                Enter the code at checkout when ordering from {shop_name}. The discount is applied directly to your order total. You can also share the code with a friend.
              </p>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
          <tr>
            <td class="px" style="padding:24px 40px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#a1a1aa;text-align:center;">
              You received this email because a voucher was issued to your PreOrder account.<br />
              This is an automated message. Please do not reply.
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:0 40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#a1a1aa;text-align:center;">
              &copy; PreOrder. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
"""


async def send_coupon_email(
    *,
    to_email: str,
    code: str,
    discount_value: float,
    shop_name: str,
    user_name: str | None = None,
) -> bool:
    """
    Send a voucher/coupon code email via Resend.

    Returns True on success.
    In dev mode (no RESEND_API_KEY) logs to console and returns True.
    """
    greeting = f"Hi {user_name}, " if user_name else ""
    html_body = _COUPON_HTML_TEMPLATE.format(
        code=code,
        discount_value=discount_value,
        shop_name=shop_name,
        greeting=greeting,
    )

    if not settings.RESEND_API_KEY:
        logger.warning(
            "[Email] RESEND_API_KEY not set — DEV MODE. Voucher %s (Rs. %.2f) for %s sent to %s",
            code, discount_value, shop_name, to_email,
        )
        print(f"\n[Email Voucher] To: {to_email}  Shop: {shop_name}  Code: {code}  Discount: Rs. {discount_value:.2f}\n", flush=True)
        return True

    try:
        resend = _get_resend()
        resend.api_key = settings.RESEND_API_KEY

        from_addr = settings.RESEND_FROM_EMAIL or "PreOrder <onboarding@resend.dev>"

        resend.Emails.send({
            "from": from_addr,
            "to": [to_email],
            "subject": f"Your {shop_name} Voucher Code: {code}",
            "html": html_body,
        })
        logger.info("[Email] Voucher sent to %s", to_email)
        return True

    except Exception as exc:
        err_str = str(exc)
        if "domain" in err_str.lower() or "testing emails" in err_str.lower():
            logger.warning(
                "[Email] Resend domain not verified. "
                "Add a verified domain at resend.com/domains and set RESEND_FROM_EMAIL. "
                "Falling back to console — Voucher for %s: %s (Rs. %.2f)",
                to_email, code, discount_value,
            )
            print(f"\n[Email Voucher] To: {to_email}  Shop: {shop_name}  Code: {code}  Discount: Rs. {discount_value:.2f}\n", flush=True)
            return True
        logger.error("[Email] Failed to send voucher to %s: %s", to_email, exc)
        return False

