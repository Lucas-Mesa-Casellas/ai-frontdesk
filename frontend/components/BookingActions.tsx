"use client";

import { useState, useTransition } from "react";
import { confirmBooking, cancelBooking } from "@/lib/dash-actions";
import { IconCheck, IconX } from "./icons";
import NotifyCaller from "./NotifyCaller";
import type { NotifyKind, NotifyLocale, NotifyState } from "@/lib/notify-message";

export default function BookingActions({
  bookingId, path, currentStatus,
  confirmLabel, confirmingLabel, cancelLabel, cancellingLabel,
  confirmedLabel, cancelledLabel, errorLabel, changeLabel, notify,
}: {
  bookingId: string; path: string; currentStatus: string;
  confirmLabel: string; confirmingLabel: string;
  cancelLabel: string; cancellingLabel: string;
  confirmedLabel: string; cancelledLabel: string; errorLabel: string; changeLabel: string;
  /** what the "Notify the caller?" offer needs; omit it to offer nothing */
  notify?: {
    phone: string | null; businessName: string; startTime: string | null; locale: NotifyLocale;
    labels: { ask: string; sms: string; whatsapp: string; skip: string };
  };
}) {
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"confirm" | "cancel" | null>(null);
  const [done, setDone] = useState<"confirm" | "cancel" | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(currentStatus === "pending");
  const [offer, setOffer] = useState<{ kind: NotifyKind; now: NotifyState; n: number } | null>(null);

  const run = (kind: "confirm" | "cancel") => {
    setAction(kind);
    setFailed(false);
    startTransition(async () => {
      try {
        if (kind === "confirm") await confirmBooking(bookingId, path);
        else await cancelBooking(bookingId, path);
        // a booking that was already settled and is changed again is a "change"
        const wasSettled = done !== null || currentStatus !== "pending";
        const now: NotifyState = kind === "confirm" ? "confirmed" : "cancelled";
        setOffer({ kind: wasSettled ? "changed" : now, now, n: (offer?.n ?? 0) + 1 });
        setDone(kind);
        setEditing(false);
      } catch (err) {
        console.error("[BookingActions]", kind, "failed for booking", bookingId, err);
        setFailed(true);
      }
    });
  };

  const settledKind: "confirm" | "cancel" | null =
    done ?? (currentStatus === "confirmed" ? "confirm" : currentStatus === "cancelled" ? "cancel" : null);

  if (!editing && settledKind) {
    const Icon = settledKind === "confirm" ? IconCheck : IconX;
    return (
      <>
      <div className="ba-row">
        {/* Status is plain text, not a button -- only "Change" below is
            clickable, so clicking the settled status itself does nothing. */}
        <span className={`ui-badge ${settledKind === "confirm" ? "ui-badge--jade" : ""}`}>
          <Icon width={12} height={12} />
          {settledKind === "confirm" ? confirmedLabel : cancelledLabel}
        </span>
        <button onClick={() => { setEditing(true); setOffer(null); }} className="cal-link-box ba-change" data-demo-write="">
          {changeLabel}
        </button>
      </div>
      {notify && offer && (
        <NotifyCaller
          key={offer.n} kind={offer.kind} now={offer.now} phone={notify.phone} businessName={notify.businessName}
          startTime={notify.startTime} locale={notify.locale} labels={notify.labels}
        />
      )}
      </>
    );
  }

  // Confirm is the one primary (jade) action; Cancel is a restrained amber.
  // While a request is running, the button that isn't running dims.
  return (
    <div className="ba-col">
      <div className="ba-row">
        <button
          disabled={pending}
          onClick={() => run("confirm")}
          data-demo-write=""
          className="ui-btn ui-btn--primary ui-btn--sm"
          style={{ opacity: pending && action !== "confirm" ? 0.5 : 1 }}
        >
          <IconCheck width={13} height={13} />
          {pending && action === "confirm" ? confirmingLabel : confirmLabel}
        </button>
        <button
          disabled={pending}
          onClick={() => run("cancel")}
          data-demo-write=""
          className="ui-btn ui-btn--warning ui-btn--sm"
          style={{ opacity: pending && action !== "cancel" ? 0.5 : 1 }}
        >
          <IconX width={13} height={13} />
          {pending && action === "cancel" ? cancellingLabel : cancelLabel}
        </button>
      </div>
      {failed && (
        <p className="ba-error">
          <IconX width={11} height={11} />
          {errorLabel}
        </p>
      )}
    </div>
  );
}
// .ba-row / .ba-col / .ba-change / .ba-error are styled in CalendarClient.tsx,
// the only place this component is rendered.
