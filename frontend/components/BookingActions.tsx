"use client";

import { useState, useTransition } from "react";
import { confirmBooking, cancelBooking } from "@/lib/dash-actions";
import { IconCheck, IconX } from "./icons";

export default function BookingActions({
  bookingId, path, confirmLabel, confirmingLabel, cancelLabel, cancellingLabel,
  confirmedLabel, cancelledLabel, errorLabel,
}: {
  bookingId: string; path: string;
  confirmLabel: string; confirmingLabel: string;
  cancelLabel: string; cancellingLabel: string;
  confirmedLabel: string; cancelledLabel: string; errorLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"confirm" | "cancel" | null>(null);
  const [done, setDone] = useState<"confirm" | "cancel" | null>(null);
  const [failed, setFailed] = useState(false);

  const run = (kind: "confirm" | "cancel") => {
    setAction(kind);
    setFailed(false);
    startTransition(async () => {
      try {
        if (kind === "confirm") await confirmBooking(bookingId, path);
        else await cancelBooking(bookingId, path);
        setDone(kind);
      } catch (err) {
        // Full detail is logged server-side in dash-actions.ts; this is a
        // secondary copy in the browser console for whoever is testing.
        console.error("[BookingActions]", kind, "failed for booking", bookingId, err);
        setFailed(true);
      }
    });
  };

  if (done) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
        color: "var(--jade)",
      }}>
        <IconCheck width={13} height={13} />
        {done === "confirm" ? confirmedLabel : cancelledLabel}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={pending}
          onClick={() => run("confirm")}
          className="ba-confirm-btn"
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
            color: "#04140D", padding: "7px 13px", borderRadius: 9, border: "none",
            cursor: pending ? "default" : "pointer",
            opacity: pending && action !== "confirm" ? 0.5 : 1,
          }}
        >
          <IconCheck width={13} height={13} />
          {pending && action === "confirm" ? confirmingLabel : confirmLabel}
        </button>
        <button
          disabled={pending}
          onClick={() => run("cancel")}
          className="ba-cancel-btn"
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
            color: "var(--text-2)", padding: "7px 13px", borderRadius: 9,
            border: "1px solid var(--hair)", cursor: pending ? "default" : "pointer",
            opacity: pending && action !== "cancel" ? 0.5 : 1,
          }}
        >
          <IconX width={13} height={13} />
          {pending && action === "cancel" ? cancellingLabel : cancelLabel}
        </button>
      </div>
      {failed && (
        <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#E5877B" }}>
          <IconX width={11} height={11} />
          {errorLabel}
        </p>
      )}
    </div>
  );
}
