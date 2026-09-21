import type { ReactNode } from "react";

/**
 * The header every dashboard page opens with: a small label (usually a
 * <Badge>), the page title, and one supporting line. Purely presentational;
 * the caller passes the text, so nothing is invented here.
 */
export default function PageHeader({
  eyebrow, title, lede, className,
}: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; className?: string }) {
  return (
    <header className={["ui-page-head", "dash-in", className ?? ""].filter(Boolean).join(" ")}>
      {eyebrow}
      <h1 className="ui-h1">{title}</h1>
      {lede && <p className="ui-lede">{lede}</p>}
    </header>
  );
}
