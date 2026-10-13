import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Request, HTTPException

from app.services.business_lookup import find_business
from app.services.scheduling import (
    DEFAULT_APPOINTMENT_MINUTES,
    is_within_business_hours,
    overlaps,
    find_alternatives,
)
from app.services.open_status import business_timezone, resolve_timezone
from app.services.retell_security import verify_retell_signature
from app.db.supabase_client import get_supabase_admin
from app.config import get_settings
from app.limiter import limiter

router = APIRouter()

# One INFO line per availability check (business id, the time as the model sent it, what
# it resolved to, the result, the duration; never a phone number, name or address).
# The app has no logging setup of its own, so give this logger a stdout handler.
log = logging.getLogger("lmc.availability")
log.setLevel(logging.INFO)
if not log.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(logging.Formatter("%(levelname)s [availability] %(message)s"))
    log.addHandler(_h)
    log.propagate = False

# A requested start more than this far in the past, or this far ahead, is the model
# hallucinating a date (2024-06-14 was once accepted silently), not a caller's wish.
PAST_GRACE = timedelta(minutes=5)
MAX_DAYS_AHEAD = 180
# Only when a business has neither a timezone of its own nor a known country.
FALLBACK_TZ = ZoneInfo("Europe/Madrid")
INVALID_DATE = {
    "available": False,
    "reason": "invalid_date",
    "message": "That date is not valid. Ask the caller to repeat the day and time.",
}


def _now(tz: ZoneInfo) -> datetime:
    """The current time in the business's timezone (a seam for tests)."""
    return datetime.now(tz)


def _duration_minutes(raw) -> int:
    """The model's duration, or the default when it is missing, zero, negative or not a number."""
    try:
        minutes = int(float(raw))
    except (TypeError, ValueError):
        return DEFAULT_APPOINTMENT_MINUTES
    return minutes if minutes > 0 else DEFAULT_APPOINTMENT_MINUTES

# Deliberate pause before responding. Our own Supabase query finishes in
# well under a second -- fast enough that Retell's "Talk While Waiting"
# filler gets cut off before it can finish playing (a known Retell platform
# behavior: the moment a tool result arrives, current audio is cut and the
# next response starts immediately). This delay gives the filler room to
# actually be heard, and also mirrors how long a real receptionist would
# take to check a calendar.
RESPONSE_DELAY_SECONDS = 2.0


def _describe_alternatives(alternatives: list[str]) -> list[dict]:
    """Attach a backend-computed weekday/date label to each alternative so
    the model never has to derive day-of-week itself from a raw ISO string
    -- it has gotten this wrong repeatedly when asked to compute it.
    """
    described = []
    for iso in alternatives:
        dt = datetime.fromisoformat(iso)
        described.append({
            "time": iso,
            "weekday": dt.strftime("%A"),
            "day_of_month": dt.day,
            "month": dt.strftime("%B"),
        })
    return described


@router.post("/functions/check-availability")
@limiter.limit("60/minute")
async def check_availability(request: Request):
    """Live custom function Retell calls mid-call when the agent needs to
    confirm a proposed appointment time.
    """
    raw_body = await request.body()
    signature = request.headers.get("x-retell-signature")
    settings = get_settings()

    if not verify_retell_signature(raw_body, signature, settings.retell_api_key):
        raise HTTPException(status_code=401, detail="invalid signature")

    payload = json.loads(raw_body)
    call_data = payload.get("call", {})
    args = payload.get("args", {})

    supabase = get_supabase_admin()
    business = find_business(supabase, call_data)
    if not business:
        return {"available": False, "message": "Unable to check availability right now."}

    opening_hours = business.get("opening_hours")

    requested_time_str = args.get("requested_time")
    if not requested_time_str:
        return {"available": False, "message": "No time was provided to check."}

    try:
        requested_start = datetime.fromisoformat(requested_time_str)
    except (ValueError, TypeError):
        log.info("business=%s requested=%r result=unparseable", business["id"], requested_time_str)
        return {"available": False, "message": "Could not understand the requested time."}

    # Everything below happens on the business's own clock: a naive time is read as
    # local time there, an aware one is converted to it.
    tz = resolve_timezone(business_timezone(supabase, business["id"]), business.get("country")) or FALLBACK_TZ
    requested_start = requested_start.replace(tzinfo=tz) if requested_start.tzinfo is None else requested_start.astimezone(tz)

    minutes = _duration_minutes(args.get("duration_minutes"))
    duration = timedelta(minutes=minutes)
    now = _now(tz)

    if requested_start < now - PAST_GRACE or requested_start > now + timedelta(days=MAX_DAYS_AHEAD):
        log.info("business=%s requested=%r resolved=%s result=invalid_date duration=%s",
                 business["id"], requested_time_str, requested_start.isoformat(), minutes)
        return dict(INVALID_DATE)

    requested_end = requested_start + duration

    if not is_within_business_hours(opening_hours, requested_start, requested_end):
        alternatives = find_alternatives(supabase, business["id"], opening_hours, requested_start, duration, now)
        result = {
            "available": False,
            "reason": "outside_business_hours",
            "alternatives": _describe_alternatives(alternatives),
            "message": "That time is outside office hours. See alternatives.",
        }
    elif not overlaps(supabase, business["id"], requested_start, requested_end):
        result = {"available": True, "message": "That time is available."}
    else:
        alternatives = find_alternatives(supabase, business["id"], opening_hours, requested_start, duration, now)
        result = {
            "available": False,
            "reason": "already_booked",
            "alternatives": _describe_alternatives(alternatives),
            "message": "That time is not available. See alternatives." if alternatives else "That time is not available, and no nearby slots were found.",
        }

    log.info("business=%s requested=%r resolved=%s result=%s duration=%s",
             business["id"], requested_time_str, requested_start.isoformat(),
             "available" if result["available"] else result["reason"], minutes)
    await asyncio.sleep(RESPONSE_DELAY_SECONDS)
    return result
