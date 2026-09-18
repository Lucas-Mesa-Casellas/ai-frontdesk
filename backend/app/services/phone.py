"""Normalizes caller-stated phone numbers to E.164, region-aware.

A caller can state their number in whatever format is natural to them --
national format with a leading trunk digit ("0782606483"), with the country
code already spoken ("+33782606483"), or simply misheard/mistranscribed
("07482606483" -- an extra digit slipped in). Storing three different-looking
values for the same real number breaks anything that later needs to
match or dedupe by phone. Uses the `phonenumbers` library (a Python port of
Google's libphonenumber) rather than hand-rolling country-code stripping --
dialing plans have enough edge cases (variable national number lengths,
mobile vs landline prefixes) that a bespoke regex would only ever cover the
formats seen in testing so far.
"""
import phonenumbers


def to_e164(raw_phone: str | None, default_region: str) -> str | None:
    """Best-effort normalize raw_phone to E.164 (e.g. "+33782606483"),
    using default_region (a business's own country, e.g. "FR"/"ES") as the
    region to assume for a number with no explicit country code.

    Returns None if raw_phone is empty, unparseable, or doesn't parse into
    a VALID number for that region -- callers should treat None as "try a
    more trusted number instead" rather than storing something malformed.
    """
    if not raw_phone:
        return None
    try:
        parsed = phonenumbers.parse(raw_phone, default_region)
    except phonenumbers.NumberParseException:
        return None
    if not phonenumbers.is_valid_number(parsed):
        return None
    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
