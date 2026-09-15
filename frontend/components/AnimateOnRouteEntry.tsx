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
//
// once/storageKey: the entrance animation is a nice touch the first time a
// visitor sees this page in a session, but replaying it every single time
// they leave and come back (e.g. Overview -> Calendar -> Overview) read as
// repetitive rather than polished. sessionStorage remembers it's already
// played; on every visit after the first, doneClassName is applied
// immediately (no animation, no flash of the un-animated start state) --
// this only matters for genuine client-side re-entries, since a real page
// load has no prior sessionStorage entry either and plays normally.
export default function AnimateOnRouteEntry({
  className, activeClassName, doneClassName, once, storageKey, children,
}: {
  className?: string;
  activeClassName: string;
  doneClassName?: string;
  once?: boolean;
  storageKey?: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  // Captured once at mount via the lazy initializer, not recomputed on every
  // render -- otherwise the moment the effect below marks storageKey as
  // played, THIS SAME first-ever mount would immediately reread that as
  // "already played" and skip straight to doneClassName, killing the
  // animation it had just started.
  const [alreadyPlayed] = useState(
    () => !!(once && storageKey && typeof window !== "undefined" && sessionStorage.getItem(storageKey) === "1")
  );
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (once && storageKey) {
      if (sessionStorage.getItem(storageKey) === "1") return;
      sessionStorage.setItem(storageKey, "1");
    }
    setActive(true);
  }, [pathname]);

  const stateClassName = alreadyPlayed ? (doneClassName ?? activeClassName) : (active ? activeClassName : "");

  return (
    <div className={[className, stateClassName].filter(Boolean).join(" ")} aria-hidden="true">
      {children}
    </div>
  );
}
