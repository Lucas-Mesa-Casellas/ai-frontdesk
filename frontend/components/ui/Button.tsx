import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "warning" | "danger";
  size?: "md" | "sm";
};

/**
 * A button. Purely presentational: it renders the `.ui-btn*` classes and
 * passes every native attribute (type, disabled, onClick, aria-*) straight
 * through, so it drops into an existing form or handler without changing what
 * it does. Links that should look like buttons use the same classes directly
 * (`<Link className="ui-btn ui-btn--secondary">`).
 */
export default function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: ButtonProps) {
  const cls = ["ui-btn", `ui-btn--${variant}`, size === "sm" ? "ui-btn--sm" : "", className ?? ""].filter(Boolean).join(" ");
  return <button type={type} className={cls} {...rest} />;
}
