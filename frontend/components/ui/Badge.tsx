import type { HTMLAttributes } from "react";

type Tone = "neutral" | "jade" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** A small filled dot before the label. */
  dot?: boolean;
  /** Pulse the dot (a gentle ring; off under prefers-reduced-motion). */
  live?: boolean;
};

/**
 * A small pill for a label or state. Purely presentational: colours come from
 * the semantic tokens in globals.css (`.ui-badge*`), and it says nothing about
 * what the state means -- callers pass the text.
 */
export default function Badge({ tone = "neutral", dot = false, live = false, className, children, ...rest }: BadgeProps) {
  const cls = ["ui-badge", tone === "neutral" ? "" : `ui-badge--${tone}`, className ?? ""].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {dot && <span className={`ui-badge-dot${live ? " ui-badge-dot--live" : ""}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
