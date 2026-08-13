"""Shared appointment-scheduling logic: default duration and availability
checks against the bookings table. Used by the live check-availability
custom function (functions.py) and by webhooks.py when computing a new
booking's end_time.
"""
from datetime import datetime, timedelta

DEFAULT_APPOINTMENT_MINUTES = 60  # TODO: make this a per-business Layer 2 setting
SLOT_STEP_MINUTES = 60
MAX_ALTERNATIVES = 3
ALTERNATIVE_SEARCH_HOURS = 6  # how far past the requested time to look, same day


def overlaps(supabase, business_id: str, start: datetime, end: datetime) -> bool:
    """True if any non-cancelled booking for this business overlaps [start, end)."""
    result = (
        supabase.table("bookings")
        .select("id")
        .eq("business_id", business_id)
        .neq("status", "cancelled")
        .lt("start_time", end.isoformat())
        .gt("end_time", start.isoformat())
        .limit(1)
        .execute()
    )
    return bool(result.data)


def find_alternatives(supabase, business_id: str, requested_start: datetime, duration: timedelta) -> list[str]:
    """Up to MAX_ALTERNATIVES free slots on the same day, stepping forward
    from the requested time. Naive fixed-step search -- fine for MVP call
    volume, revisit if a business has a genuinely packed calendar."""
    alternatives = []
    candidate = requested_start
    horizon = requested_start + timedelta(hours=ALTERNATIVE_SEARCH_HOURS)
    while candidate < horizon and len(alternatives) < MAX_ALTERNATIVES:
        candidate = candidate + timedelta(minutes=SLOT_STEP_MINUTES)
        candidate_end = candidate + duration
        if not overlaps(supabase, business_id, candidate, candidate_end):
            alternatives.append(candidate.isoformat())
    return alternatives
