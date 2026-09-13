// This business operates in Madrid; call/booking timestamps are stored in
// UTC (Postgres timestamptz), and must always be *displayed* -- and, where
// a display decision depends on "which day is this," *grouped* -- in this
// timezone. Never rely on the server's or browser's default timezone: on
// most hosts that's UTC, which is exactly the bug this constant prevents.
export const BUSINESS_TZ = "Europe/Madrid";

// [year, month(1-12), day], as seen in BUSINESS_TZ, for a given instant.
// Used wherever code needs to know "which calendar day" a UTC timestamp
// falls on locally (grouping bookings by day, today's date), as opposed to
// just formatting a string for display (use timeZone: BUSINESS_TZ directly
// on Intl.DateTimeFormat / toLocale*String for that).
export function madridYMD(date: Date): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return [get("year"), get("month"), get("day")];
}

// The hour of day (0-23), as seen in BUSINESS_TZ, for a given instant.
// Used to bucket calls by local hour-of-day (e.g. the Overview page's
// calls-by-hour chart) instead of by the server's default timezone.
export function madridHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value);
}

// The weekday (0=Monday..6=Sunday), as seen in BUSINESS_TZ, for a given
// instant. Same Monday-first convention already used for the calendar
// grid's own firstWeekday calc (app/dashboard/calendar/page.tsx), so a
// weekday index means the same thing everywhere in this app. Derived from
// madridYMD (the calendar date) rather than a separate Intl call, since
// weekday depends only on the date, not the time-of-day component.
export function madridWeekday(date: Date): number {
  const [y, m, d] = madridYMD(date);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}

// The UTC instant corresponding to a given wall-clock date/time as observed
// in `timeZone` -- e.g. zonedTimeToUtc(2026, 6, 1) is "midnight on July 1st,
// Madrid time" expressed as the real UTC instant that is, not the UTC
// calendar day. Needed anywhere a query range must line up with a Madrid
// calendar boundary (a month, in practice) rather than a UTC one: Madrid
// runs 1-2h ahead of UTC, so "day 1 at UTC midnight" and "day 1 at Madrid
// midnight" are never the same moment, and a query using the former can
// mis-bucket bookings made within that gap around the start/end of a month.
//
// month0 is 0-based (January = 0), matching JS Date's own convention, and
// is allowed to overflow (month0: 12 correctly rolls into January of the
// next year) the same way `new Date(year, month0, day)` does.
export function zonedTimeToUtc(
  year: number,
  month0: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone: string = BUSINESS_TZ
): Date {
  const utcGuess = Date.UTC(year, month0, day, hour, minute, second);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Re-parse "the wall-clock time timeZone actually showed at utcGuess" as
  // if it were itself UTC -- the gap between the two is exactly timeZone's
  // UTC offset at that moment (never ambiguous for a plain midnight, since
  // Madrid's DST transitions land at 2-3am local, never at midnight).
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(utcGuess - (asIfUtc - utcGuess));
}
