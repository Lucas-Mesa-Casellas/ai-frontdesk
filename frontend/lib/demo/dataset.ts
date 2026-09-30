// One busy, internally consistent set of fake calls and bookings per language,
// built relative to "today" so the demo always looks current: calls over the
// last 30 days, appointments from about two weeks back to ten days ahead.
//
// Deterministic (seeded): the same language on the same day always gives the
// same rows with the same ids, so opening a call from the list finds it again.
// The only thing that moves with the clock is the time of the handful of calls
// "from this morning" (their place in the list and their ids don't change).
import { SCENARIOS, type Locale, type Scenario } from "./scenarios";

type Row = Record<string, unknown>;
export type DemoData = {
  business: Row & { id: string; language: Locale };
  calls: Row[];
  bookings: Row[];
  userId: string;
};

const TZ = "Europe/Madrid";

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
});
function tzParts(ms: number) {
  const o: Record<string, string> = {};
  partsFmt.formatToParts(new Date(ms)).forEach((p) => { o[p.type] = p.value; });
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute };
}
// Madrid wall-clock time -> UTC milliseconds (day may overflow the month)
function madridToUtc(y: number, m0: number, d: number, h: number, mi: number) {
  const want = Date.UTC(y, m0, d, h, mi);
  let guess = want;
  for (let i = 0; i < 3; i++) {
    const p = tzParts(guess);
    guess += want - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  }
  return guess;
}

// hour of day -> how busy (a morning peak around nine, an afternoon one around three)
const HOUR_W = [0.03, 0.02, 0.02, 0.02, 0.03, 0.06, 0.15, 0.45, 0.9, 1.0, 0.95, 0.7, 0.4, 0.35, 0.75, 1.05, 1.0, 0.7, 0.4, 0.2, 0.12, 0.08, 0.05, 0.04];

type Entry = {
  o: number | null; status: "pending" | "confirmed" | "cancelled"; hi: boolean;
  h: number; m: number; callMs?: number; undated?: boolean;
  call?: Row;
};

function build(locale: Locale, nowMs: number): DemoData {
  const S = SCENARIOS[locale];
  const r = mulberry({ en: 11, es: 23, fr: 37 }[locale]);
  const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const weighted = (w: number[]) => {
    let t = w.reduce((a, b) => a + b, 0) * r();
    for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; }
    return w.length - 1;
  };
  const shuffle = <T,>(a: T[]) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const now = tzParts(nowMs);
  const Y = now.y, M0 = now.m - 1, TODAY = now.d;
  // a day is an offset from today (0 = today, -1 = yesterday, 1 = tomorrow)
  const at = (o: number, h: number, mi: number) => madridToUtc(Y, M0, TODAY + o, h, mi);
  const dow = (o: number) => new Date(Date.UTC(Y, M0, TODAY + o)).getUTCDay(); // 0 = Sunday
  const minsAgo = (m: number) => nowMs - m * 60e3;

  const BIZ = "b7c2d4e1-5a36-4f0e-9d21-3c8a6e1f4b70";
  const USER = "00000000-0000-0000-0000-000000000001";
  const business = {
    id: BIZ, owner_id: USER, name: S.business.name, language: S.business.language, country: S.business.country,
    notification_email: S.business.email, phone_number: null, opening_hours: null,
  };

  // ---------------- people ----------------
  const phoneOf: Record<string, string> = {};
  const person = (name: string) => (phoneOf[name] ||= S.phone(r));
  let nameBagList: string[] = [];
  const nameBag = () => { if (!nameBagList.length) nameBagList = shuffle(S.names); return nameBagList.pop()!; };

  // ---------------- scenario bags (no repeats within a window) ----------------
  const bags: Record<string, Scenario[]> = {};
  const draw = (key: string, list: Scenario[]) => { const b = (bags[key] ||= []); if (!b.length) b.push(...shuffle(list)); return b.pop()!; };
  const byKind = (k: string, f?: (s: Scenario) => boolean) => S.scen.filter((s) => s.k === k && (!f || f(s)));
  const scenBook = (high: boolean) => draw("book_" + high, byKind("book", (s) => (high ? s.u === "high" : s.u !== "high")));
  const scenBookNT = () => draw("book_nt", byKind("book", (s) => !!s.nt));
  const scenCb = () => draw("cb", byKind("cb"));
  const scenInq = () => draw("inq", byKind("inq"));
  const scenOther = () => draw("other", byKind("other", (s) => !s.unknown));
  const scenUnknown = () => byKind("other", (s) => !!s.unknown)[0];

  // ---------------- times ----------------
  const randomTime = (o: number) => at(o, weighted(HOUR_W), ri(0, 59));
  const dayWeight = (o: number) => (dow(o) === 0 ? 0.3 : dow(o) === 6 ? 0.45 : 1);

  // ---------------- the appointment plan ----------------
  const weekdays: number[] = [];
  for (let o = -16; o <= 10; o++) if (dow(o) >= 1 && dow(o) <= 5 && o !== 0 && o !== 1) weekdays.push(o);
  const sats: number[] = [];
  for (let o = -16; o <= 10; o++) if (dow(o) === 6) sats.push(o);
  const planDays = [...weekdays, ...sats.slice(1, 3)];
  const counts: Record<number, number> = {};
  planDays.forEach((o) => (counts[o] = 1));
  let toPlace = 44 - 5 - planDays.length; // 44 dated requests, 5 of them fixed below
  const cand = planDays.filter((o) => o !== 0);
  while (toPlace > 0) {
    const o = cand[weighted(cand.map((x) => (x < 0 ? 1.25 : 0.8)))];
    if (counts[o] < 4) { counts[o]++; toPlace--; }
  }

  const entries: Entry[] = [];
  const apptTime = () => ({ h: ri(9, 17), m: pick([0, 15, 30, 45]) });
  planDays.forEach((o) => {
    for (let i = 0; i < counts[o]; i++) {
      const p = r();
      const status: Entry["status"] = o < 0 ? (p < 0.79 ? "confirmed" : p < 0.92 ? "cancelled" : "pending") : (p < 0.66 ? "pending" : "confirmed");
      entries.push({ o, status, hi: false, ...apptTime() });
    }
  });
  // a few urgent ones among the recent past (shown as handled once confirmed or cancelled)
  shuffle(entries.filter((e) => (e.o as number) < -1 && (e.o as number) > -13)).slice(0, 4).forEach((e, i) => {
    e.hi = true;
    e.status = i === 3 ? "cancelled" : "confirmed";
  });
  // at most one cancelled request per past day, five in all
  const seenC: Record<number, boolean> = {};
  let cancelledTotal = 0;
  entries.forEach((e) => {
    if (e.status !== "cancelled") return;
    if (seenC[e.o as number] || cancelledTotal >= 5) e.status = "confirmed";
    else { seenC[e.o as number] = true; cancelledTotal++; }
  });
  // today: one booked earlier in the week and confirmed, the urgent one from this morning, a pending one
  entries.push({ o: 0, status: "confirmed", h: 9, m: 30, hi: false });
  entries.push({ o: 0, status: "pending", h: 14, m: 0, hi: true, callMs: minsAgo(84) });
  entries.push({ o: 0, status: "pending", h: 16, m: 45, hi: false });
  // tomorrow: the urgent one from half an hour ago, and a routine one
  entries.push({ o: 1, status: "pending", h: 9, m: 30, hi: true, callMs: minsAgo(31) });
  entries.push({ o: 1, status: "pending", h: 15, m: 15, hi: false, callMs: minsAgo(205) });
  // requests without a date
  entries.push({ o: null, status: "pending", h: 0, m: 0, hi: false, undated: true, callMs: minsAgo(139) });
  entries.push({ o: null, status: "pending", h: 0, m: 0, hi: false, undated: true, callMs: minsAgo(330) });

  // ---------------- calls ----------------
  const calls: Row[] = [];
  const bookings: Row[] = [];
  let n = 0;
  const cid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  const fixedNames = new Set<string>();

  const transcript = (sc: Scenario, name: string, kind: string, pref: string | null) => {
    const first = name.split(" ")[0];
    const lines: [string, string][] = [["Agent", S.opener], ["User", sc.c1 ?? ""], ["Agent", sc.a1 ?? ""], ["User", sc.c2 ?? ""]];
    lines.push(["Agent", kind === "book" ? S.bookClose(pref ?? "") : kind === "cb" ? S.cbClose : S.inqClose]);
    lines.push(["User", S.nameLine(name)]);
    lines.push(["Agent", S.bye(first)]);
    return lines.map(([w, t]) => `${w}: ${t}`).join("\n");
  };

  const mkCall = (o: { sc: Scenario; ms: number; undated?: boolean; fixed?: boolean; review?: boolean }) => {
    n++;
    const sc = o.sc;
    const unknown = !!sc.unknown;
    let name: string | null = null;
    if (!unknown) {
      name = nameBag();
      for (let i = 0; i < 40 && !o.fixed && fixedNames.has(name); i++) name = nameBag();
      if (o.fixed) fixedNames.add(name);
    }
    const phone = name ? person(name) : null;
    const kind = sc.k;
    const intent = kind === "book" ? "book_appointment" : kind === "cb" ? "callback" : kind === "inq" ? "inquiry" : "other";
    const review = o.review || kind === "other";
    const dur = kind === "book" ? ri(95, 300) : kind === "cb" ? ri(60, 210) : kind === "inq" ? ri(40, 170) : unknown ? ri(6, 14) : ri(20, 90);
    const pref = kind === "book" ? (o.undated ? S.undatedPref : sc.pref ?? null) : null;
    const call: Row = {
      id: cid(n), business_id: BIZ, source: "retell", caller_name: name, caller_phone: phone,
      intent, status: review ? "needs_review" : "request_captured", urgency: sc.u, summary: sc.s, translations: {},
      created_at: new Date(o.ms).toISOString(),
      transcript: unknown ? S.unknownLines.map(([w, t]) => `${w}: ${t}`).join("\n") : transcript(sc, name!, kind, pref),
      duration_seconds: dur, preferred_time: pref, preferred_time_iso: null, next_action: null, notes: null,
      topic: sc.tp,
      outcome_reason: unknown ? S.outcome.other : kind === "book" ? (sc.u === "high" ? S.outcome.bookHigh : S.outcome.book) : S.outcome[kind],
      user_sentiment: unknown ? "Neutral" : pick(["Positive", "Positive", "Neutral", "Neutral", "Negative"]),
      disconnection_reason: unknown ? "user_hangup" : pick(["user_hangup", "agent_hangup", "agent_hangup"]),
      booking_type: kind === "book" ? "appointment" : null, party_size: null,
    };
    calls.push(call);
    return call;
  };

  // booking calls -- the most visible (fixed) ones first, so their names stay unique
  const isFixed = (e: Entry) => !!e.callMs || e.o === 0 || !!e.undated;
  entries.sort((a, b) => Number(isFixed(b)) - Number(isFixed(a)));
  entries.forEach((e) => {
    const sc = e.undated ? scenBookNT() : scenBook(e.hi);
    let callMs = e.callMs;
    if (!callMs) {
      const o = e.o as number;
      if (e.hi) {
        // urgent: booked the same day, a couple of hours before the visit
        const apptMs = at(o, e.h, e.m);
        for (let i = 0; i < 200 && !callMs; i++) {
          const t = at(o, ri(6, Math.max(6, e.h - 1)), ri(0, 59));
          if (t < apptMs - 45 * 60e3) callMs = t;
        }
        callMs = callMs || apptMs - 2 * 3600e3;
      } else {
        callMs = randomTime(Math.max(-29, Math.min(o - ri(1, 5), -1)));
      }
    }
    const call = mkCall({ sc, ms: callMs, undated: e.undated, fixed: isFixed(e) });
    const start = e.undated ? null : at(e.o as number, e.h, e.m);
    if (start) call.preferred_time_iso = new Date(start).toISOString();
    bookings.push({
      id: `00000000-0000-4000-9000-${String(bookings.length + 1).padStart(12, "0")}`, business_id: BIZ, call_id: call.id, booking_type: "appointment",
      customer_name: call.caller_name, customer_phone: call.caller_phone, party_size: null, notes: call.preferred_time,
      start_time: start ? new Date(start).toISOString() : null, end_time: start ? new Date(start + 3600e3).toISOString() : null,
      status: e.status, created_at: new Date(new Date(call.created_at as string).getTime() + 30e3).toISOString(),
    });
  });

  // the rest of this morning's list, then the random remainder
  ([[9, "inq"], [58, "cb"], [107, "unknown"], [171, "inq"], [262, "cb"]] as [number, string][]).forEach(([m, kind]) => {
    const sc = kind === "inq" ? scenInq() : kind === "cb" ? scenCb() : scenUnknown();
    mkCall({ sc, ms: minsAgo(m), fixed: true });
  });

  // kinds still to place: cb 28, inq 58, other 8 (two of each already placed, one "other")
  const placed: Record<string, number> = { cb: 2, inq: 2, other: 1 };
  const want: Record<string, number> = { cb: 28, inq: 58, other: 8 };
  const kinds: string[] = [];
  ["cb", "inq", "other"].forEach((k) => { for (let i = placed[k]; i < want[k]; i++) kinds.push(k); });
  const days: number[] = [];
  for (let o = -29; o <= -1; o++) days.push(o);
  let reviewLeft = 3;
  shuffle(kinds).forEach((k) => {
    const o = days[weighted(days.map(dayWeight))];
    const sc = k === "cb" ? scenCb() : k === "inq" ? scenInq() : r() < 0.4 ? scenUnknown() : scenOther();
    const review = k === "cb" && reviewLeft > 0 && r() < 0.15 && reviewLeft-- > 0;
    mkCall({ sc, ms: randomTime(o), review });
  });

  calls.sort((a, b) => ((a.created_at as string) < (b.created_at as string) ? 1 : -1));
  return { business, calls, bookings, userId: USER };
}

// Rebuilt when the language or the day changes (rows are identical within a day;
// only this morning's call times follow the clock, so they are refreshed every 10 minutes).
const cache = new Map<string, DemoData>();
export function demoData(locale: Locale, nowMs = Date.now()): DemoData {
  const p = tzParts(nowMs);
  const key = `${locale}:${p.y}-${p.m}-${p.d}:${Math.floor(nowMs / 600e3)}`;
  let d = cache.get(key);
  if (!d) {
    if (cache.size > 12) cache.clear();
    d = build(locale, nowMs);
    cache.set(key, d);
  }
  return d;
}
