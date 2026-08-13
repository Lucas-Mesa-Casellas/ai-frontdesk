"""Shared appointment-scheduling logic: default duration, business hours,
and availability checks against the bookings table. Used by the live
check-availability custom function (functions.py) and by webhooks.py when
computing a new booking's end_time.
"""
from datetime import datetime, timedelta

DEFAULT_APPOINTMENT_MINUTES = 60  # TODO: make this a per-business Layer 2 setting
SLOT_STEP_MINUTES = 60
MAX_ALTERNATIVES = 3
MAX_CANDIDATES_TO_CHECK = 40  # bounds the search so it always terminates

# TODO: make these per-business Layer 2 settings (must match the office_hours
# text in each agent's prompt -- currently duplicated as free text there and
# structured here, kept in sync by hand until Layer 2 exists for real).
OFFICE_OPEN_HOUR = 9
OFFICE_CLOSE_HOUR = 18
OFFICE_DAYS = {0, 1, 2, 3, 4}  # Mon-Fri (datetime.weekday(): Mon=0 ... Sun=6)


def is_within_business_hours(start: datetime, end: datetime) -> bool:
    """True if [start, end) falls entirely within office hours on a business day."""
    if start.weekday() not in OFFICE_DAYS:
        return False
    if start.hour < OFFICE_OPEN_HOUR:
        return False
    if end.hour > OFFICE_CLOSE_HOUR or (end.hour == OFFICE_CLOSE_HOUR and end.minute > 0):
        return False
    return True


def _next_business_start(dt: datetime) -> datetime:
    """Roll dt forward to the next valid business-hours instant -- skips
    weekends and hours outside OFFICE_OPEN_HOUR-OFFICE_CLOSE_HOUR."""
    while True:
        if dt.weekday() not in OFFICE_DAYS:
            dt = (dt + timedelta(days=1)).replace(hour=OFFICE_OPEN_HOUR, minute=0, second=0, microsecond=0)
            continue
        if dt.hour < OFFICE_OPEN_HOUR:
            dt = dt.replace(hour=OFFICE_OPEN_HOUR, minute=0, second=0, microsecond=0)
            continue
        if dt.hour >= OFFICE_CLOSE_HOUR:
            dt = (dt + timedelta(days=1)).replace(hour=OFFICE_OPEN_HOUR, minute=0, second=0, microsecond=0)
            continue
        return dt


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
    """Up to MAX_ALTERNATIVES free slots within business hours, stepping
    forward from the requested time and rolling into later business days
    if needed. Naive fixed-step search -- fine for MVP call volume, revisit
    if a business has a genuinely packed calendar."""
    alternatives = []
    candidate = _next_business_start(requested_start + timedelta(minutes=SLOT_STEP_MINUTES))
    for _ in range(MAX_CANDIDATES_TO_CHECK):
        if len(alternatives) >= MAX_ALTERNATIVES:
            break
        candidate_end = candidate + duration
        if is_within_business_hours(candidate, candidate_end) and not overlaps(supabase, business_id, candidate, candidate_end):
            alternatives.append(candidate.isoformat())
        candidate = _next_business_start(candidate + timedelta(minutes=SLOT_STEP_MINUTES))
    return alternatives
