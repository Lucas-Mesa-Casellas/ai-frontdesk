"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the page's server queries every `seconds` while the tab is visible
 * (and once when the tab comes back into view), so figures that say "live"
 * really are at most a minute old. Renders nothing.
 */
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      router.refresh();
    };
    const id = setInterval(refresh, seconds * 1000);
    const onVisible = () => { if (Date.now() - last > seconds * 1000) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [router, seconds]);

  return null;
}
