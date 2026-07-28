import hashlib
import hmac
import re
import time

# v=<timestamp_ms>,d=<hex_digest>
SIGNATURE_RE = re.compile(r"v=(\d+),d=(.*)")
MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000  # Retell's own documented tolerance window


def verify_retell_signature(raw_body: bytes, signature_header: str | None, api_key: str) -> bool:
    """
    Verify that a webhook request genuinely came from Retell, not a forged
    POST from anyone who found the URL. Before this, /webhooks/retell
    accepted any request from anyone — fake calls, fake bookings, arbitrary
    OpenAI extraction spend, and emails sent from our verified domain, all
    with zero authentication.

    Retell signs every webhook with an x-retell-signature header shaped
    like `v=<timestamp_ms>,d=<hex_digest>`. The digest is
    HMAC-SHA256(raw_body + timestamp, api_key) using the specific Retell
    API key marked with the "webhook" badge in the Retell dashboard — not
    just any API key.

    Spec: https://docs.retellai.com/features/secure-webhook
    """
    if not signature_header:
        return False

    match = SIGNATURE_RE.match(signature_header)
    if not match:
        return False

    timestamp_str, digest = match.group(1), match.group(2)

    try:
        timestamp_ms = int(timestamp_str)
    except ValueError:
        return False

    if abs(int(time.time() * 1000) - timestamp_ms) > MAX_SIGNATURE_AGE_MS:
        return False

    expected = hmac.new(
        api_key.encode("utf-8"),
        raw_body + timestamp_str.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, digest)
