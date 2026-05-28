from __future__ import annotations

import re


# E.164:
# + followed by 7-15 digits
_E164_RE = re.compile(
    r"^\+[1-9]\d{6,14}$"
)


def normalize_e164(
    phone: str,
) -> str:
    """
    Normalize phone numbers
    into E.164 format.

    Supported:
    +919876543210
    919876543210
    9876543210
    """

    raw = phone.strip()

    if not raw:
        raise ValueError(
            "Phone number is required"
        )

    if raw.startswith("+"):
        digits = raw[1:]

    else:
        digits = "".join(
            ch
            for ch in raw
            if ch.isdigit()
        )

    if not digits.isdigit():
        raise ValueError(
            (
                "Phone must contain "
                "only digits"
            )
        )

    # Assume India for plain 10-digit numbers
    if len(digits) == 10:
        digits = f"91{digits}"

    normalized = f"+{digits}"

    if not _E164_RE.fullmatch(
        normalized
    ):
        raise ValueError(
            "Invalid phone number"
        )

    return normalized


def is_valid_e164(
    phone: str,
) -> bool:

    try:
        normalize_e164(phone)
        return True

    except ValueError:
        return False


def phones_match(
    a: str,
    b: str,
) -> bool:
    """
    Compare phone numbers
    independent of formatting.
    """

    try:
        return (
            normalize_e164(a)
            == normalize_e164(b)
        )

    except ValueError:
        return False