import type { ElementType, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLElement> & {
  /** The element to render. A card that is a whole section can be a <section>. */
  as?: ElementType;
  /** The one accent card in a set: a stronger jade edge and a soft glow. */
  accent?: boolean;
};

/**
 * The dashboard's card surface. Purely presentational: it renders the shared
 * `.dash-card` classes (defined once, from the design tokens, in globals.css)
 * and passes everything else through, so animation classes (`dash-in d1`),
 * layout classes and ARIA attributes all keep working exactly as before.
 * No state, no data, no behaviour.
 */
export default function Card({ as: Tag = "div", accent = false, className, children, ...rest }: CardProps) {
  const cls = ["dash-card", accent ? "dash-card-highlight" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
