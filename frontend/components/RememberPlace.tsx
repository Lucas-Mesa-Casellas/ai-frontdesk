"use client";

import { useEffect } from "react";

// Remembers, in the cookie proxy.ts reads, that the visitor is in the dashboard
// -- so opening the site again (typed address, bookmark, reopened browser)
// takes them back to the Overview. Only the area is kept, not the page.
//
// This runs in the browser because proxy.ts cannot tell a real visit from the
// background fetches Next.js makes on its own; the proxy still records full
// page loads by itself, so this also works with scripts blocked.
export default function RememberPlace() {
  useEffect(() => {
    document.cookie = "lmc_area=dashboard;path=/;max-age=2592000;samesite=lax";
  }, []);
  return null;
}
