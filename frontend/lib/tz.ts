// Call/booking timestamps are stored in UTC (Postgres timestamptz), and must always
// be *displayed* -- and, where a display decision depends on "which day is this,"
// *grouped* -- in the business's own timezone. Never rely on the server's or
// browser's default timezone: on most hosts that's UTC.
//
// businessTimeZone() is the ONE place that decides which timezone that is, with the
// same chain as the backend (backend/app/services/open_status.py, business_zone):
// businesses.timezone (migration 013), else the usual timezone of its country, else
// Europe/Madrid.
export const FALLBACK_TZ = "Europe/Madrid";
const COUNTRY_TZ: Record<string, string> = {
  ES: "Europe/Madrid", FR: "Europe/Paris", GB: "Europe/London", PT: "Europe/Lisbon",
  IT: "Europe/Rome", DE: "Europe/Berlin", BE: "Europe/Brussels", NL: "Europe/Amsterdam",
};

function isTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}

export function businessTimeZone(business: { timezone?: string | null; country?: string | null } | null | undefined): string {
  const own = business?.timezone?.trim();
  if (own && isTimeZone(own)) return own;
  const byCountry = COUNTRY_TZ[(business?.country ?? "").trim().toUpperCase()];
  return byCountry ?? FALLBACK_TZ;
}

// [year, month(1-12), day], as seen in timeZone, for a given instant.
// Used wherever code needs to know "which calendar day" a UTC timestamp
// falls on locally (grouping bookings by day, today's date), as opposed to
// just formatting a string for display (pass the timeZone directly to
// Intl.DateTimeFormat / toLocale*String for that).
export function zonedYMD(date: Date, timeZone: string): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return [get("year"), get("month"), get("day")];
}

// The hour of day (0-23), as seen in timeZone, for a given instant.
// Used to bucket calls by local hour-of-day (e.g. the Overview page's
// calls-by-hour chart) instead of by the server's default timezone.
export function zonedHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value);
}

// The day of the week as seen in timeZone: 0 = Monday ... 6 = Sunday.
// Used to bucket calls by local weekday (the Overview's calls-by-day chart).
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export function zonedWeekday(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return WEEKDAY_INDEX[name] ?? 0;
}

// The UTC instant corresponding to a given wall-clock date/time as observed
// in `timeZone` -- e.g. zonedTimeToUtc(2026, 6, 1, 0, 0, 0, "Europe/Madrid") is
// "midnight on July 1st, Madrid time" expressed as the real UTC instant that is,
// not the UTC calendar day. Needed anywhere a query range must line up with the
// business's calendar boundary (a month, a day) rather than a UTC one: "day 1 at
// UTC midnight" and "day 1 at local midnight" are different moments, and a query
// using the former can mis-bucket bookings made within that gap.
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
  timeZone: string
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
  // UTC offset at that moment (never ambiguous for a plain midnight in Europe,
  // where DST transitions land at 1-3am local, never at midnight; tested for
  // the 25 Oct 2026 change in tests/tz.test.ts).
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(utcGuess - (asIfUtc - utcGuess));
}
