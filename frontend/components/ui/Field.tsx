import type { ReactNode } from "react";

/**
 * A label above a control. Purely presentational: the caller supplies the
 * control (an `<input className="ui-input">` / `<textarea>`), so field names,
 * values and handlers stay exactly where they were. `htmlFor` ties the label
 * to the control's id.
 */
export default function Field({
  label, htmlFor, hint, children, className,
}: { label: ReactNode; htmlFor?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={["ui-field", className ?? ""].filter(Boolean).join(" ")}>
      <label className="ui-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <p className="ui-hint">{hint}</p>}
    </div>
  );
}
