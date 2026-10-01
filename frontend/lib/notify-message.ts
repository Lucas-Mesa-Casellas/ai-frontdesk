// The text the owner can send to a caller after confirming, cancelling or changing a
// booking, and the sms: / WhatsApp links that open the owner's own messaging app with
// that text ready. Nothing is sent from here: the owner reads it and taps Send.
//
// Pure functions with no imports, so they are unit-tested on their own
// (tests/notify-message.test.ts). Written for a business talking to its customers:
// "usted" in Spanish, "vous" in French, and French punctuation with a non-breaking
// space before ! ? : ; so a line never starts with a lone mark.

export type NotifyLocale = "en" | "es" | "fr";
export type NotifyKind = "confirmed" | "cancelled" | "changed";
export type NotifyState = "confirmed" | "cancelled";

const NB = " "; // non-breaking space

const REGION: Record<NotifyLocale, string> = { en: "en-GB", es: "es-ES", fr: "fr-FR" };

/** "+33 6 39 98 12 47" -> "+33639981247". Anything that is not a plain phone number
 *  (empty, masked with bullets, too short or too long) -> null. A number without a
 *  leading "+" or "00" is returned as digits only (fine for SMS, not for WhatsApp). */
export function usablePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[\s.\-()]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!/^\+?\d{8,15}$/.test(s)) return null;
  return s;
}

/** "Tuesday 6 October at 10:30" / "el martes 6 de octubre a las 10:30" / "le mardi 6 octobre à 10 h 30".
 *  null when the booking has no date. Rendered in the business's timezone. */
export function formatWhen(locale: NotifyLocale, iso: string | null | undefined, timeZone: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat(REGION[locale], {
    timeZone, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const day = Number(get("day"));
  const month = get("month");
  const hour = Number(get("hour"));
  const minute = get("minute");
  const hh = String(hour).padStart(2, "0");

  if (locale === "en") return `${weekday} ${day} ${month} at ${hh}:${minute}`;
  if (locale === "es") return `el ${weekday} ${day} de ${month} ${hour === 1 ? "a la" : "a las"} ${hour}:${minute}`;
  // French: "1er" for the first, "10 h 30" / "10 h" for the time
  const frDay = day === 1 ? "1er" : String(day);
  const frTime = minute === "00" ? `${hour} h` : `${hour} h ${minute}`;
  return `le ${weekday} ${frDay} ${month} à ${frTime}`;
}

const STATE_WORD: Record<NotifyLocale, Record<NotifyState, string>> = {
  en: { confirmed: "confirmed", cancelled: "cancelled" },
  es: { confirmed: "confirmada", cancelled: "cancelada" },
  fr: { confirmed: "confirmé", cancelled: "annulé" },
};

type Parts = { biz: string; when: string | null };

const TEMPLATES: Record<NotifyLocale, {
  confirmed: (p: Parts) => string;
  cancelled: (p: Parts) => string;
  changed: (p: Parts, state: string) => string;
}> = {
  en: {
    confirmed: ({ biz, when }) => when
      ? `Hello, this is ${biz}. Your appointment is confirmed for ${when}. See you then!`
      : `Hello, this is ${biz}. Your appointment is confirmed. We'll let you know the exact time.`,
    cancelled: ({ biz, when }) => when
      ? `Hello, this is ${biz}. Your appointment on ${when} has been cancelled. Reply here if you'd like to book another time.`
      : `Hello, this is ${biz}. Your appointment request has been cancelled. Reply here if you'd like to book another time.`,
    changed: ({ biz, when }, state) => when
      ? `Hello, this is ${biz}. Your appointment on ${when} has changed: it is now ${state}.`
      : `Hello, this is ${biz}. Your appointment request has changed: it is now ${state}.`,
  },
  es: {
    confirmed: ({ biz, when }) => when
      ? `Hola, le escribimos de ${biz}. Su cita queda confirmada para ${when}. ¡Le esperamos!`
      : `Hola, le escribimos de ${biz}. Su cita queda confirmada. Le avisaremos de la hora exacta.`,
    cancelled: ({ biz, when }) => when
      ? `Hola, le escribimos de ${biz}. Su cita para ${when} ha sido cancelada. Si lo desea, buscamos otra fecha.`
      : `Hola, le escribimos de ${biz}. Su solicitud de cita ha sido cancelada. Si lo desea, buscamos otra fecha.`,
    changed: ({ biz, when }, state) => when
      ? `Hola, le escribimos de ${biz}. Su cita para ${when} ha cambiado: ahora está ${state}.`
      : `Hola, le escribimos de ${biz}. Su solicitud de cita ha cambiado: ahora está ${state}.`,
  },
  fr: {
    confirmed: ({ biz, when }) => when
      ? `Bonjour, ici ${biz}. Votre rendez-vous est confirmé pour ${when}. À bientôt${NB}!`
      : `Bonjour, ici ${biz}. Votre rendez-vous est confirmé. Nous vous préciserons l’horaire très vite.`,
    cancelled: ({ biz, when }) => when
      ? `Bonjour, ici ${biz}. Votre rendez-vous pour ${when} a été annulé. N’hésitez pas à nous recontacter pour en fixer un autre.`
      : `Bonjour, ici ${biz}. Votre demande de rendez-vous a été annulée. N’hésitez pas à nous recontacter pour en fixer un autre.`,
    changed: ({ biz, when }, state) => when
      ? `Bonjour, ici ${biz}. Votre rendez-vous pour ${when} a changé${NB}: il est désormais ${state}.`
      : `Bonjour, ici ${biz}. Votre demande de rendez-vous a changé${NB}: elle est désormais ${state}.`,
  },
};

export type NotifyInput = {
  kind: NotifyKind;
  /** for "changed": what the booking is now */
  now?: NotifyState;
  locale: NotifyLocale;
  businessName: string;
  startTime: string | null | undefined;
  timeZone: string;
};

export function buildNotifyMessage(i: NotifyInput): string {
  const parts: Parts = { biz: i.businessName.trim() || "", when: formatWhen(i.locale, i.startTime, i.timeZone) };
  const t = TEMPLATES[i.locale];
  if (i.kind === "confirmed") return t.confirmed(parts);
  if (i.kind === "cancelled") return t.cancelled(parts);
  let state = STATE_WORD[i.locale][i.now ?? "confirmed"];
  // French: "elle est désormais confirmée" for a request without a date
  if (i.locale === "fr" && !parts.when) state = i.now === "cancelled" ? "annulée" : "confirmée";
  return t.changed(parts, state);
}

/** sms: link; works with the number as "+33…" or national digits. */
export function smsHref(phone: string, text: string): string {
  return `sms:${phone}?body=${encodeURIComponent(text)}`;
}

/** wa.me link; WhatsApp needs the international number, so null without a "+". */
export function whatsappHref(phone: string, text: string): string | null {
  if (!phone.startsWith("+")) return null;
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
}
