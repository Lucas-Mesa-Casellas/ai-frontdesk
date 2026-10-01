"use client";

import { useState } from "react";
import {
  buildNotifyMessage, smsHref, usablePhone, whatsappHref,
  type NotifyKind, type NotifyLocale, type NotifyState,
} from "@/lib/notify-message";
import { BUSINESS_TZ } from "@/lib/tz";

// After the owner confirms, cancels or changes a booking: offer to tell the caller.
// Two buttons open the owner's own SMS or WhatsApp app with the message already
// written (in the business's language); the owner reads it and sends it. Nothing is
// sent from here, and without a usable phone number nothing is offered at all.
// The buttons carry data-demo-write, so the demo disables them like every write control.
export default function NotifyCaller({
  kind, now, phone, businessName, startTime, locale, labels,
}: {
  kind: NotifyKind;
  now?: NotifyState;
  phone: string | null;
  businessName: string;
  startTime: string | null;
  locale: NotifyLocale;
  labels: { ask: string; sms: string; whatsapp: string; skip: string };
}) {
  const [hidden, setHidden] = useState(false);
  const number = usablePhone(phone);
  if (hidden || !number) return null;

  const text = buildNotifyMessage({ kind, now, locale, businessName, startTime, timeZone: BUSINESS_TZ });
  const wa = whatsappHref(number, text);
  // after a tap the bar has done its job (the app opens in front of the page)
  const done = () => setTimeout(() => setHidden(true), 400);

  return (
    <div className="nc" role="group" aria-label={labels.ask}>
      <span className="nc-q">{labels.ask}</span>
      <a className="ui-btn ui-btn--secondary ui-btn--sm" href={smsHref(number, text)} onClick={done} data-demo-write="">{labels.sms}</a>
      {wa && (
        <a className="ui-btn ui-btn--secondary ui-btn--sm" href={wa} target="_blank" rel="noopener noreferrer" onClick={done} data-demo-write="">{labels.whatsapp}</a>
      )}
      <button type="button" className="nc-skip" onClick={() => setHidden(true)}>{labels.skip}</button>
      <style>{`
        .nc { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; padding: 10px 12px; border-radius: 12px; background: rgba(55,226,155,.05); border: 1px solid rgba(55,226,155,.18); }
        .nc-q { font-size: 12.5px; font-weight: 500; color: var(--text-2); margin-right: 2px; }
        .nc .ui-btn { text-decoration: none; }
        .nc-skip { font-size: 12px; color: var(--text-3); padding: 6px 8px; border-radius: 8px; }
        .nc-skip:hover { color: var(--text); background: rgba(255,255,255,.05); }
        @media (max-width: 560px) { .nc .ui-btn, .nc-skip { min-height: 40px; } }
      `}</style>
    </div>
  );
}
