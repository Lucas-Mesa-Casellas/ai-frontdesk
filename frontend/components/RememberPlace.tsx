"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Remembers, in the two cookies proxy.ts reads, that the visitor is in the
// dashboard and which page they are on -- so opening the site again (typed
// address, bookmark, reopened browser) can take them straight back.
//
// This runs in the browser because proxy.ts cannot tell a real visit from the
// background fetches Next.js makes on its own (link prefetches and in-app
// navigations arrive there as ordinary requests, and would overwrite the
// remembered page with one the visitor never opened). The proxy still records
// full page loads by itself, so this also works with scripts blocked.
export default function RememberPlace() {
  const pathname = usePathname();
  useEffect(() => {
    const opts = ";path=/;max-age=2592000;samesite=lax";
    document.cookie = `dash_last_path=${encodeURIComponent(pathname)}${opts}`;
    document.cookie = `lmc_area=dashboard${opts}`;
  }, [pathname]);
  return null;
}
