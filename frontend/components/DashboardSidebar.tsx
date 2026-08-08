"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button
        className="sidebar-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .28s var(--e-out)" }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`dash-aside${open ? " open" : ""}`}>
        {children}
      </aside>
    </>
  );
}
