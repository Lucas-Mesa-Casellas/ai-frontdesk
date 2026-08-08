"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`nav-link${active ? " active" : ""}`}
      style={{
        display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
        borderRadius: 10, fontSize: 13.5, fontWeight: 500,
        textDecoration: "none", transition: "background .2s var(--e-out), color .2s var(--e-out)",
      }}
    >
      {children}
    </Link>
  );
}
