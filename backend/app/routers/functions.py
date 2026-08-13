import asyncio
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, HTTPException

from app.services.business_lookup import find_business
from app.services.scheduling import (
    DEFAULT_APPOINTMENT_MINUTES,
    is_within_business_hours,
    overlaps,
    find_alternatives,
)
from app.services.retell_security import verify_retell_signature
from app.db.supabase_client import get_supabase_admin
from app.config import get_settings
from app.limiter import limiter

router = APIRouter()

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

    requested_time_str = args.get("requested_time")
    if not requested_time_str:
        return {"available": False, "message": "No time was provided to check."}

    try:
        requested_start = datetime.fromisoformat(requested_time_str)
    except ValueError:
        return {"available": False, "message": "Could not understand the requested time."}

    duration_minutes = args.get("duration_minutes") or DEFAULT_APPOINTMENT_MINUTES
    duration = timedelta(minutes=duration_minutes)
    requested_end = requested_start + duration

    if not is_within_business_hours(requested_start, requested_end):
        alternatives = find_alternatives(supabase, business["id"], requested_start, duration)
        result = {
            "available": False,
            "reason": "outside_business_hours",
            "alternatives": alternatives,
            "message": "That time is outside office hours. See alternatives.",
        }
    elif not overlaps(supabase, business["id"], requested_start, requested_end):
        result = {"available": True, "message": "That time is available."}
    else:
        alternatives = find_alternatives(supabase, business["id"], requested_start, duration)
        result = {
            "available": False,
            "reason": "already_booked",
            "alternatives": alternatives,
            "message": "That time is not available. See alternatives." if alternatives else "That time is not available, and no nearby slots were found.",
        }

    await asyncio.sleep(RESPONSE_DELAY_SECONDS)
    return result
