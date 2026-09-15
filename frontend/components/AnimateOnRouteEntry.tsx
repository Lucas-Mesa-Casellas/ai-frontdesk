"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// A CSS animation that's simply declared on an element (present from that
// element's very first computed style) doesn't reliably replay when Next's
// App Router does a client-side navigation back into this route -- unlike a
// full page load, there's no guarantee the browser treats the element as
// "newly inserted" in a way that (re)starts the animation. Explicitly
// toggling a class in a mount effect sidesteps that entirely: the element
// always starts without activeClassName (so the animation's initial
// keyframe applies, whatever that resolves to) and this effect adds it a
// moment later, which is a genuine style *change* the browser is guaranteed
// to animate from -- and that effect reliably fires on every real
// navigation into this route, since a sibling-route swap under the App
// Router unmounts the previous page's tree and mounts a fresh one.
export default function AnimateOnRouteEntry({
  className, activeClassName, children,
}: {
  className?: string;
  activeClassName: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
  }, [pathname]);

  return (
    <div className={[className, active ? activeClassName : ""].filter(Boolean).join(" ")} aria-hidden="true">
      {children}
    </div>
  );
}
