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


@router.post("/functions/check-availability")
@limiter.limit("60/minute")
async def check_availability(request: Request):
    """Live custom function Retell calls mid-call when the agent needs to
    confirm a proposed appointment time. Must respond quickly since the
    caller is waiting on the line for this answer.
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
        readable = ", ".join(datetime.fromisoformat(a).strftime("%a %H:%M") for a in alternatives)
        return {
            "available": False,
            "alternatives": alternatives,
            "message": f"That's outside office hours. Nearby open times: {readable}." if alternatives else "That's outside office hours, and no nearby slots were found.",
        }

    if not overlaps(supabase, business["id"], requested_start, requested_end):
        return {"available": True, "message": "That time is available."}

    alternatives = find_alternatives(supabase, business["id"], requested_start, duration)
    if alternatives:
        readable = ", ".join(
            datetime.fromisoformat(a).strftime("%H:%M") for a in alternatives
        )
        return {
            "available": False,
            "alternatives": alternatives,
            "message": f"That time is not available. Nearby open times the same day: {readable}.",
        }

    return {
        "available": False,
        "alternatives": [],
        "message": "That time is not available, and no nearby slots were found the same day.",
    }
