"""Shared appointment-scheduling logic: default duration, business hours,
and availability checks against the bookings table. Used by the live
check-availability custom function (functions.py) and by webhooks.py when
computing a new booking's end_time.

Business hours are read from businesses.opening_hours (jsonb), not hardcoded
-- shape:
{
  "is_24_7": false,
  "days": {
    "mon": [{"open": "08:00", "close": "12:00"}, {"open": "13:30", "close": "17:30"}], ... ,
    "sat": [], "sun": []
  }
}
Each day is a LIST of windows, not a single {open, close} -- lets a day have
a closure in the middle (a lunch break) rather than one continuous span. An
empty list means closed that day (the old convention was null; this is the
list-shaped equivalent of the same thing). A missing/empty opening_hours
falls back to a safe default (Mon-Fri 09:00-18:00, no midday closure) so a
business that hasn't been configured yet doesn't silently become 24/7.
"""
from datetime import datetime, timedelta

DEFAULT_APPOINTMENT_MINUTES = 60  # TODO: make this a per-business Layer 2 setting
SLOT_STEP_MINUTES = 60
MAX_ALTERNATIVES = 3
MAX_CANDIDATES_TO_CHECK = 40  # bounds the search so it always terminates

_WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]  # datetime.weekday() order

_DEFAULT_OPENING_HOURS = {
    "is_24_7": False,
    "days": {
        "mon": [{"open": "09:00", "close": "18:00"}],
        "tue": [{"open": "09:00", "close": "18:00"}],
        "wed": [{"open": "09:00", "close": "18:00"}],
        "thu": [{"open": "09:00", "close": "18:00"}],
        "fri": [{"open": "09:00", "close": "18:00"}],
        "sat": [],
        "sun": [],
    },
}


def _day_windows(opening_hours: dict, weekday: int) -> list[tuple[int, int, int, int]]:
    """Return this weekday's windows as (open_h, open_m, close_h, close_m)
    tuples, in the order they're stored. An empty list means closed."""
    days = (opening_hours or {}).get("days") or _DEFAULT_OPENING_HOURS["days"]
    windows = days.get(_WEEKDAY_KEYS[weekday]) or []
    parsed = []
    for w in windows:
        open_h, open_m = (int(x) for x in w["open"].split(":"))
        close_h, close_m = (int(x) for x in w["close"].split(":"))
        parsed.append((open_h, open_m, close_h, close_m))
    return parsed


def is_within_business_hours(opening_hours: dict, start: datetime, end: datetime) -> bool:
    """True if [start, end) falls entirely within ONE of this business's
    windows for that day -- an appointment can't span across a midday
    closure just because it starts in the morning window and ends in the
    afternoon one."""
    opening_hours = opening_hours or _DEFAULT_OPENING_HOURS
    if opening_hours.get("is_24_7"):
        return True

    for open_h, open_m, close_h, close_m in _day_windows(opening_hours, start.weekday()):
        if (start.hour, start.minute) < (open_h, open_m):
            continue
        if (end.hour, end.minute) > (close_h, close_m):
            continue
        return True
    return False


def _next_business_start(opening_hours: dict, dt: datetime) -> datetime:
    """Roll dt forward to the next valid business-hours instant for this
    business -- skips closed days, hours before the day's first window,
    and gaps BETWEEN windows (e.g. a lunch closure rolls forward to the
    afternoon window's open, not to the next day). 24/7 businesses return
    dt unchanged."""
    opening_hours = opening_hours or _DEFAULT_OPENING_HOURS
    if opening_hours.get("is_24_7"):
        return dt

    while True:
        for open_h, open_m, close_h, close_m in _day_windows(opening_hours, dt.weekday()):
            if (dt.hour, dt.minute) < (open_h, open_m):
                return dt.replace(hour=open_h, minute=open_m, second=0, microsecond=0)
            if (dt.hour, dt.minute) < (close_h, close_m):
                return dt
            # dt is at/after this window's close -- try the next window
            # today (if any) before giving up on the whole day.
        dt = (dt + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)


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


def find_alternatives(supabase, business_id: str, opening_hours: dict, requested_start: datetime, duration: timedelta) -> list[str]:
    """Up to MAX_ALTERNATIVES free slots within this business's hours,
    stepping forward from the requested time and rolling into later
    business days if needed. Naive fixed-step search -- fine for MVP call
    volume, revisit if a business has a genuinely packed calendar.

    Seeded from max(requested_start, now) so a requested_start that's
    already in the past (e.g. "as soon as possible" resolving to earlier
    today) can't hand back slots that have already gone by -- this was
    checking business hours and existing bookings, but never the actual
    current time.
    """
    alternatives = []
    now = datetime.now(requested_start.tzinfo)
    candidate = _next_business_start(opening_hours, max(requested_start, now) + timedelta(minutes=SLOT_STEP_MINUTES))
    for _ in range(MAX_CANDIDATES_TO_CHECK):
        if len(alternatives) >= MAX_ALTERNATIVES:
            break
        candidate_end = candidate + duration
        if candidate >= now and is_within_business_hours(opening_hours, candidate, candidate_end) and not overlaps(supabase, business_id, candidate, candidate_end):
            alternatives.append(candidate.isoformat())
        candidate = _next_business_start(opening_hours, candidate + timedelta(minutes=SLOT_STEP_MINUTES))
    return alternatives
