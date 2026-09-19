"use client";

import { useEffect, useRef, useState } from "react";

const PLAYED_KEY = "ov-count-played";

/**
 * A stat number that counts up from 0 the first time the Overview is seen in
 * a session (then just renders the value, so navigating back and forth isn't
 * a show every time). Renders the real value on the server and before
 * hydration, so it's correct with no JS and under prefers-reduced-motion.
 * A later value change (the page refreshing itself) snaps straight to it.
 */
export default function CountUp({ value, locale, suffix = "" }: { value: number; locale: string; suffix?: string }) {
  const [n, setN] = useState(value);
  const first = useRef(true);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;

    let skip = !isFirst || value === 0;
    if (!skip) {
      try { skip = sessionStorage.getItem(PLAYED_KEY) === "1"; } catch { /* private mode: just animate */ }
    }
    if (!skip) skip = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip) { setN(value); return; }

    const start = performance.now();
    const dur = 900;
    let raf = 0;
    setN(0);
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
      else { try { sessionStorage.setItem(PLAYED_KEY, "1"); } catch { /* ignore */ } }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{n.toLocaleString(locale)}{suffix}</>;
}
