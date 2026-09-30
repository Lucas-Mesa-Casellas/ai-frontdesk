"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

// Layout, colour and the active/hover states all live in the `.nav-link`
// class (dashboard/layout.tsx), not inline, so they can be styled as states.
export default function NavLink({ href, exact = false, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`nav-link${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
