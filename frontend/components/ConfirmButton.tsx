"use client";

import { useState, useTransition } from "react";
import { confirmBooking } from "@/lib/dash-actions";
import { IconCheck } from "./icons";

export default function ConfirmButton({
  bookingId, path, label, labelPending,
}: { bookingId: string; path: string; label: string; labelPending: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      disabled={pending || done}
      onClick={() => startTransition(async () => {
        await confirmBooking(bookingId, path);
        setDone(true);
      })}
      style={{
        display: "flex", alignItems: "center", gap: 7, flex: "none",
        fontSize: 12.5, fontWeight: 600, color: "#04140D",
        padding: "8px 15px", borderRadius: 10, border: "none",
        cursor: pending || done ? "default" : "pointer",
        background: "linear-gradient(180deg,#5CEBAF,var(--jade-2))",
        opacity: pending ? 0.7 : 1,
      }}
    >
      <IconCheck width={13} height={13} />
      {pending ? labelPending : label}
    </button>
  );
}
