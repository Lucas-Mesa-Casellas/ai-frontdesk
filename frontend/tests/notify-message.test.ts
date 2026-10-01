// Run from frontend/:  npm test   (Node's built-in runner, no extra dependency)
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNotifyMessage, formatWhen, smsHref, usablePhone, whatsappHref } from "../lib/notify-message.ts";

const TZ = "Europe/Madrid";
// 6 Oct 2026 10:30 in Madrid (CEST, UTC+2) = 08:30 UTC
const TUESDAY_1030 = "2026-10-06T08:30:00Z";

test("phone numbers: usable ones are normalised, the rest are rejected", () => {
  assert.equal(usablePhone("+33 6 39 98 12 47"), "+33639981247");
  assert.equal(usablePhone("+44 7700 900123"), "+447700900123");
  assert.equal(usablePhone("0033 6 39 98 12 47"), "+33639981247");
  assert.equal(usablePhone("06.39.98.12.47"), "0639981247"); // national: fine for SMS
  assert.equal(usablePhone("(+34) 612-345-678"), "+34612345678");
  for (const bad of [null, undefined, "", "   ", "+34 6•• ••• 482", "abc", "12345", "+1234567890123456", "+33 6 39 98 12 4x"]) {
    assert.equal(usablePhone(bad as string | null), null, String(bad));
  }
});

test("WhatsApp needs an international number; SMS does not", () => {
  assert.equal(whatsappHref("0639981247", "hi"), null);
  assert.equal(whatsappHref("+33639981247", "Hi there"), "https://wa.me/33639981247?text=Hi%20there");
  assert.equal(smsHref("+33639981247", "Hi there"), "sms:+33639981247?body=Hi%20there");
  assert.equal(smsHref("0639981247", "a&b=c"), "sms:0639981247?body=a%26b%3Dc"); // the text can't break the link
});

test("date and time are in the business's timezone and read naturally in each language", () => {
  assert.equal(formatWhen("en", TUESDAY_1030, TZ), "Tuesday 6 October at 10:30");
  assert.equal(formatWhen("es", TUESDAY_1030, TZ), "el martes 6 de octubre a las 10:30");
  assert.equal(formatWhen("fr", TUESDAY_1030, TZ), "le mardi 6 octobre à 10 h 30");
  assert.equal(formatWhen("fr", "2026-10-01T07:00:00Z", TZ), "le jeudi 1er octobre à 9 h"); // 1er, and "9 h" on the hour
  assert.equal(formatWhen("es", "2026-10-05T11:15:00Z", TZ), "el lunes 5 de octubre a las 13:15");
  assert.equal(formatWhen("es", "2026-10-05T23:30:00Z", TZ), "el martes 6 de octubre a la 1:30"); // "a la", before 01:xx next day
  assert.equal(formatWhen("en", TUESDAY_1030, "America/New_York"), "Tuesday 6 October at 04:30"); // the timezone argument is honoured
  assert.equal(formatWhen("en", null, TZ), null);
  assert.equal(formatWhen("en", "not a date", TZ), null);
});

const base = { businessName: "LMC Agents", startTime: TUESDAY_1030, timeZone: TZ };

test("confirmed, in three languages", () => {
  assert.equal(buildNotifyMessage({ ...base, locale: "en", kind: "confirmed" }),
    "Hello, this is LMC Agents. Your appointment is confirmed for Tuesday 6 October at 10:30. See you then!");
  assert.equal(buildNotifyMessage({ ...base, locale: "es", kind: "confirmed" }),
    "Hola, le escribimos de LMC Agents. Su cita queda confirmada para el martes 6 de octubre a las 10:30. ¡Le esperamos!");
  assert.equal(buildNotifyMessage({ ...base, locale: "fr", kind: "confirmed" }),
    "Bonjour, ici LMC Agents. Votre rendez-vous est confirmé pour le mardi 6 octobre à 10 h 30. À bientôt !");
});

test("cancelled, in three languages", () => {
  assert.equal(buildNotifyMessage({ ...base, locale: "en", kind: "cancelled" }),
    "Hello, this is LMC Agents. Your appointment on Tuesday 6 October at 10:30 has been cancelled. Reply here if you'd like to book another time.");
  assert.equal(buildNotifyMessage({ ...base, locale: "es", kind: "cancelled" }),
    "Hola, le escribimos de LMC Agents. Su cita para el martes 6 de octubre a las 10:30 ha sido cancelada. Si lo desea, buscamos otra fecha.");
  assert.equal(buildNotifyMessage({ ...base, locale: "fr", kind: "cancelled" }),
    "Bonjour, ici LMC Agents. Votre rendez-vous pour le mardi 6 octobre à 10 h 30 a été annulé. N’hésitez pas à nous recontacter pour en fixer un autre.");
});

test("changed says what the booking is now", () => {
  assert.equal(buildNotifyMessage({ ...base, locale: "en", kind: "changed", now: "cancelled" }),
    "Hello, this is LMC Agents. Your appointment on Tuesday 6 October at 10:30 has changed: it is now cancelled.");
  assert.equal(buildNotifyMessage({ ...base, locale: "es", kind: "changed", now: "confirmed" }),
    "Hola, le escribimos de LMC Agents. Su cita para el martes 6 de octubre a las 10:30 ha cambiado: ahora está confirmada.");
  assert.equal(buildNotifyMessage({ ...base, locale: "fr", kind: "changed", now: "confirmed" }),
    "Bonjour, ici LMC Agents. Votre rendez-vous pour le mardi 6 octobre à 10 h 30 a changé : il est désormais confirmé.");
});

test("a booking without a date still gets a sensible message", () => {
  const none = { ...base, startTime: null };
  assert.equal(buildNotifyMessage({ ...none, locale: "en", kind: "confirmed" }), "Hello, this is LMC Agents. Your appointment is confirmed. We'll let you know the exact time.");
  assert.equal(buildNotifyMessage({ ...none, locale: "es", kind: "cancelled" }), "Hola, le escribimos de LMC Agents. Su solicitud de cita ha sido cancelada. Si lo desea, buscamos otra fecha.");
  assert.equal(buildNotifyMessage({ ...none, locale: "fr", kind: "changed", now: "cancelled" }), "Bonjour, ici LMC Agents. Votre demande de rendez-vous a changé : elle est désormais annulée.");
});

test("French punctuation: a non-breaking space before ! ? : and no plain space", () => {
  for (const kind of ["confirmed", "cancelled", "changed"] as const) {
    const msg = buildNotifyMessage({ ...base, locale: "fr", kind, now: "confirmed" });
    assert.doesNotMatch(msg, / [!?:;]/, `${kind}: a plain space before punctuation`);
  }
});

test("the business name is used as given, and an empty name never leaves 'undefined'", () => {
  const msg = buildNotifyMessage({ ...base, businessName: "  Plomberie & Fils  ", locale: "fr", kind: "confirmed" });
  assert.match(msg, /ici Plomberie & Fils\./);
  assert.doesNotMatch(buildNotifyMessage({ ...base, businessName: "", locale: "en", kind: "confirmed" }), /undefined|null/);
});

test("the sms and WhatsApp links carry the whole message, accents and all", () => {
  const text = buildNotifyMessage({ ...base, locale: "fr", kind: "confirmed" });
  const wa = whatsappHref("+33639981247", text)!;
  assert.equal(decodeURIComponent(wa.split("?text=")[1]), text);
  assert.equal(decodeURIComponent(smsHref("+33639981247", text).split("?body=")[1]), text);
});
