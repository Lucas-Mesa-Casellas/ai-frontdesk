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
