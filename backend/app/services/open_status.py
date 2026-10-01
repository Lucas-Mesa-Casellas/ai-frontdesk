"""Is the business open right now? Decided here, in code, from the business's own
opening hours and timezone -- not by the voice agent's LLM, which compares a
decimal hour to a schedule unreliably (a closed office at 19:30 was announced as
open). Retell calls /webhooks/retell-inbound before the agent speaks and gets the
answer back as dynamic variables.

The schedule logic itself is scheduling.py's (multi-window days, lunch breaks,
24/7), shared with the booking code, so opening hours mean one thing everywhere.
"""
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.services.scheduling import (
    _DEFAULT_OPENING_HOURS,
    _day_windows,
    _next_business_start,
    is_within_business_hours,
)

_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Only a fallback for a business whose own timezone isn't set yet (businesses.country
# exists on every row; businesses.timezone is filled in by migration 013 and by hand).
COUNTRY_TIMEZONES = {
    "ES": "Europe/Madrid", "FR": "Europe/Paris", "GB": "Europe/London", "PT": "Europe/Lisbon",
    "IT": "Europe/Rome", "DE": "Europe/Berlin", "BE": "Europe/Brussels", "NL": "Europe/Amsterdam",
}


def resolve_timezone(tz_name: str | None, country: str | None) -> ZoneInfo | None:
    """The business's own timezone; failing that, the usual one for its country;
    failing that None (the caller then answers nothing rather than guessing)."""
    for name in (tz_name, COUNTRY_TIMEZONES.get((country or "").upper())):
        if not name:
            continue
        try:
            return ZoneInfo(name)
        except (ZoneInfoNotFoundError, ValueError):
            continue
    return None


def _hhmm(h: int, m: int) -> str:
    return f"{h:02d}:{m:02d}"


def open_status(opening_hours: dict | None, tz: ZoneInfo, now_utc: datetime | None = None) -> tuple[bool, str]:
    """(is_open_now, a short English line for the agent), at the business's local
    time. A window is open from its opening minute up to, not including, its closing
    minute: at exactly 17:30 a business closing at 17:30 is closed."""
    oh = opening_hours or _DEFAULT_OPENING_HOURS
    now = (now_utc or datetime.now(timezone.utc)).astimezone(tz).replace(second=0, microsecond=0)

    if oh.get("is_24_7"):
        return True, "open 24/7"

    end = now + timedelta(minutes=1)
    if end.date() != now.date():
        end = now  # the last minute of the day: don't let the end spill into tomorrow
    if is_within_business_hours(oh, now, end):
        for open_h, open_m, close_h, close_m in _day_windows(oh, now.weekday()):
            if (open_h, open_m) <= (now.hour, now.minute) < (close_h, close_m):
                return True, f"open now, until {_hhmm(close_h, close_m)}"
        return True, "open now"

    # closed: when does it open next? (a schedule with no window on any day never does)
    if not any(_day_windows(oh, d) for d in range(7)):
        return False, "closed now"
    nxt = _next_business_start(oh, now)
    when = _hhmm(nxt.hour, nxt.minute)
    if nxt.date() == now.date():
        return False, f"closed now, opens again today at {when}"
    return False, f"closed now, next opening {_DAY_NAMES[nxt.weekday()]} {when}"
