from __future__ import annotations

import re

# E.164 phone: starts with +, followed by 7-15 digits
_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def normalize_e164(phone: str) -> str:
    """
    Normalise a phone number to E.164 (+CCXXXXXXXXX).
    Accepts:
    - "+919876543210"  -> "+919876543210"
    - "919876543210"   -> "+919876543210"
    - "9876543210"     -> "+919876543210"  (10-digit: assume India)
    Raises ValueError on invalid input.
    """
    phone = phone.strip()
    if phone.startswith("+"):
        digits = phone[1:]
    else:
        digits = "".join(c for c in phone if c.isdigit())

    if not digits.isdigit():
        raise ValueError("Phone must contain only digits (optionally prefixed with +)")

    if len(digits) == 10:
        digits = "91" + digits  # Default: Indian country code

    if len(digits) < 7 or len(digits) > 15:
        raise ValueError(f"Invalid phone number length ({len(digits)} digits)")

    return f"+{digits}"


def is_valid_e164(phone: str) -> bool:
    try:
        normalized = normalize_e164(phone)
        return bool(_E164_RE.match(normalized))
    except ValueError:
        return False


def phones_match(a: str, b: str) -> bool:
    """Compare two phone numbers regardless of formatting."""
    try:
        return normalize_e164(a) == normalize_e164(b)
    except ValueError:
        return False
