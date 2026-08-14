"use client";

import { useState, useTransition } from "react";
import { confirmBooking, cancelBooking } from "@/lib/dash-actions";
import { IconCheck, IconX } from "./icons";

export default function BookingActions({
  bookingId, path, confirmLabel, confirmingLabel, cancelLabel, cancellingLabel,
}: {
  bookingId: string; path: string;
  confirmLabel: string; confirmingLabel: string;
  cancelLabel: string; cancellingLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"confirm" | "cancel" | null>(null);
  const [done, setDone] = useState(false);

  const run = (kind: "confirm" | "cancel") => {
    setAction(kind);
    startTransition(async () => {
      if (kind === "confirm") await confirmBooking(bookingId, path);
      else await cancelBooking(bookingId, path);
      setDone(true);
    });
  };

  if (done) return null;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        disabled={pending}
        onClick={() => run("confirm")}
        style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
          color: "#04140D", padding: "7px 13px", borderRadius: 9, border: "none",
          cursor: pending ? "default" : "pointer",
          background: "linear-gradient(180deg,#5CEBAF,var(--jade-2))",
          opacity: pending && action !== "confirm" ? 0.5 : 1,
        }}
      >
        <IconCheck width={13} height={13} />
        {pending && action === "confirm" ? confirmingLabel : confirmLabel}
      </button>
      <button
        disabled={pending}
        onClick={() => run("cancel")}
        style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600,
          color: "var(--text-2)", padding: "7px 13px", borderRadius: 9,
          border: "1px solid var(--hair)", cursor: pending ? "default" : "pointer",
          background: "transparent",
          opacity: pending && action !== "cancel" ? 0.5 : 1,
        }}
      >
        <IconX width={13} height={13} />
        {pending && action === "cancel" ? cancellingLabel : cancelLabel}
      </button>
    </div>
  );
}
