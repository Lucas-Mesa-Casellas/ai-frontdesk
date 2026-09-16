"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Generic enough for both a booking (calendar) and a call (call detail) --
// the caller supplies the already-bound server action (deleteBooking/
// deleteCall with their id+path baked in via .bind, so this component
// never needs to know which one it's calling) plus whatever labels/styling
// fit that context. A native confirm() dialog rather than a custom modal:
// this is a one-off, infrequent, destructive action, not something worth a
// bespoke confirmation UI tonight.
//
// redirectTo: deleting a booking from a list just needs that row gone
// (revalidatePath inside the action already handles that) -- but deleting
// the very call this page IS showing needs to navigate away afterward, and
// a Server Component parent can't hand this Client Component an arbitrary
// client-side closure to do that, only a plain string it then acts on
// itself via useRouter.
export default function DeleteButton({
  action, label, confirmMessage, errorLabel, redirectTo, onDeleted, className, style,
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
  errorLabel: string;
  redirectTo?: string;
  onDeleted?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const handleClick = () => {
    if (!window.confirm(confirmMessage)) return;
    setFailed(false);
    startTransition(async () => {
      try {
        await action();
        onDeleted?.();
        if (redirectTo) router.push(redirectTo);
      } catch (err) {
        console.error("[DeleteButton] delete failed", err);
        setFailed(true);
      }
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button onClick={handleClick} disabled={pending} className={className} style={style}>
        {pending ? "…" : label}
      </button>
      {failed && <span style={{ fontSize: 11, color: "#E5877B" }}>{errorLabel}</span>}
    </span>
  );
}
