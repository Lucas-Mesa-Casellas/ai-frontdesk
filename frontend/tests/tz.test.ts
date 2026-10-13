// Run from frontend/:  npm test
// The dashboard's date helpers (lib/tz.ts) with the business's own timezone: the same
// call and booking seen from Paris, Madrid and Mexico City, and the 25 Oct 2026 DST change.
import { test } from "node:test";
import assert from "node:assert/strict";
import { businessTimeZone, FALLBACK_TZ, zonedHour, zonedTimeToUtc, zonedWeekday, zonedYMD } from "../lib/tz.ts";

const PARIS = "Europe/Paris";
const MADRID = "Europe/Madrid";
const MEXICO = "America/Mexico_City"; // UTC-6 all year (no DST since 2022)

test("businessTimeZone: own timezone, then the country's, then Europe/Madrid", () => {
  assert.equal(businessTimeZone({ timezone: "Europe/Paris", country: "ES" }), PARIS);
  assert.equal(businessTimeZone({ timezone: MEXICO }), MEXICO);
  assert.equal(businessTimeZone({ timezone: null, country: "FR" }), PARIS);
  assert.equal(businessTimeZone({ timezone: "", country: "gb" }), "Europe/London");
  assert.equal(businessTimeZone({ timezone: "Not/AZone", country: "ES" }), MADRID); // invalid name: next link
  assert.equal(businessTimeZone({ country: "ZZ" }), FALLBACK_TZ);
  assert.equal(businessTimeZone(null), FALLBACK_TZ);
  assert.equal(FALLBACK_TZ, MADRID);
});

// a call at 2026-10-15 22:30 UTC, and a booking at 2026-10-16 07:00 UTC
const call = new Date("2026-10-15T22:30:00Z");
const booking = new Date("2026-10-16T07:00:00Z");

test("the same call lands on the right local day and hour in each business timezone", () => {
  assert.deepEqual(zonedYMD(call, PARIS), [2026, 10, 16]); // 00:30 next day (UTC+2)
  assert.deepEqual(zonedYMD(call, MADRID), [2026, 10, 16]);
  assert.deepEqual(zonedYMD(call, MEXICO), [2026, 10, 15]); // 16:30 the same day (UTC-6)
  assert.equal(zonedHour(call, PARIS), 0);
  assert.equal(zonedHour(call, MEXICO), 16);
  assert.equal(zonedWeekday(call, PARIS), 4); // Friday (0 = Monday)
  assert.equal(zonedWeekday(call, MEXICO), 3); // Thursday
});

test("the dashboard's display formatting follows the business timezone", () => {
  const fmt = (d: Date, tz: string) =>
    d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: tz }) + " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: tz });
  assert.equal(fmt(booking, PARIS), "vendredi 16 octobre 09:00");
  assert.equal(fmt(booking, MADRID), "vendredi 16 octobre 09:00");
  assert.equal(fmt(booking, MEXICO), "vendredi 16 octobre 01:00");
  assert.equal(fmt(call, MEXICO), "jeudi 15 octobre 16:30");
});

test("query bounds: local midnight of a day, as a UTC instant", () => {
  // month0 is 0-based: 9 = October
  assert.equal(zonedTimeToUtc(2026, 9, 16, 0, 0, 0, PARIS).toISOString(), "2026-10-15T22:00:00.000Z");
  assert.equal(zonedTimeToUtc(2026, 9, 16, 0, 0, 0, MEXICO).toISOString(), "2026-10-16T06:00:00.000Z");
  // the calls filter "to 15 Oct" ends at local midnight of the 16th: the Paris call above is outside it
  const parisEnd = zonedTimeToUtc(2026, 9, 15 + 1, 0, 0, 0, PARIS);
  assert.ok(call >= parisEnd);
  const mexicoEnd = zonedTimeToUtc(2026, 9, 15 + 1, 0, 0, 0, MEXICO);
  assert.ok(call < mexicoEnd); // in Mexico City it is still the 15th
});

test("DST change, Sunday 25 Oct 2026 in Paris (+02:00 -> +01:00)", () => {
  // midnight before the change is still summer time, midnight after it is winter time
  assert.equal(zonedTimeToUtc(2026, 9, 25, 0, 0, 0, PARIS).toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(zonedTimeToUtc(2026, 9, 26, 0, 0, 0, PARIS).toISOString(), "2026-10-25T23:00:00.000Z");
  // a 09:00 booking on the day of the change is 08:00 UTC (+01:00)
  assert.equal(zonedTimeToUtc(2026, 9, 25, 9, 0, 0, PARIS).toISOString(), "2026-10-25T08:00:00.000Z");
  // both 02:30s exist: 00:30 UTC and 01:30 UTC are both 02:30 on the 25th, same day and hour
  for (const iso of ["2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"]) {
    assert.deepEqual(zonedYMD(new Date(iso), PARIS), [2026, 10, 25]);
    assert.equal(zonedHour(new Date(iso), PARIS), 2);
  }
  // the day before the change ends at 22:00 UTC, the day itself at 23:00 UTC (25 hours long)
  const start = zonedTimeToUtc(2026, 9, 25, 0, 0, 0, PARIS).getTime();
  const end = zonedTimeToUtc(2026, 9, 26, 0, 0, 0, PARIS).getTime();
  assert.equal((end - start) / 3600e3, 25);
});

test("calendar labels are calendar-day anchors: formatted in UTC, never in the business timezone", () => {
  // the calendar builds its month title, weekday header and selected-day label from Date.UTC(...) midnights
  const oct1 = new Date(Date.UTC(2026, 9, 1));
  const title = (tz: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: tz }).format(oct1);
  assert.equal(title("UTC"), "octobre 2026");
  assert.equal(title(MEXICO), "septembre 2026"); // why the anchors must not use the business timezone
});
