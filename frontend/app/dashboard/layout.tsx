import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { ReactNode } from "react";
import LangSwitcher from "@/components/LangSwitcher";
import { IconOverview, IconPhone, IconCalendar, IconGear } from "@/components/icons";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = DASH_T[locale];

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("owner_id", user.id)
    .single();

  const initial = business?.name?.[0] || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex" }}>
      <aside style={{
        width: 248, borderRight: "1px solid var(--hair)", background: "rgba(255,255,255,.018)",
        display: "flex", flexDirection: "column", position: "fixed", height: "100%", zIndex: 20,
      }}>
        <div style={{ padding: "22px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(155deg,var(--jade),var(--jade-deep))",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="18.6" cy="5.4" r="2.85" fill="#04140D" />
            </svg>
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em" }}>LMC Agents</span>
        </div>

        <div role="navigation" aria-label="Dashboard" style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <NavLink href="/dashboard"><IconOverview width={17} height={17} />{t.navOverview}</NavLink>
          <NavLink href="/dashboard/calls"><IconPhone width={17} height={17} />{t.navCalls}</NavLink>
          <NavLink href="/dashboard/calendar"><IconCalendar width={17} height={17} />{t.navCalendar}</NavLink>
          <NavLink href="/dashboard/settings"><IconGear width={17} height={17} />{t.navSettings}</NavLink>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid var(--hair)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <LangSwitcher current={locale} path="/dashboard" />
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
            borderRadius: 12, background: "rgba(255,255,255,.035)",
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: "50%", flex: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(155deg,var(--jade),var(--jade-deep))",
              color: "#04140D", fontSize: 12, fontWeight: 700,
            }}>
              {initial}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {business?.name || user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div role="main" style={{ flex: 1, marginLeft: 248 }}>{children}</div>

      <style>{`
        .nav-link:hover { background: rgba(255,255,255,.055); color: var(--text); }
      `}</style>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="nav-link"
      style={{
        display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
        borderRadius: 10, color: "var(--text-2)", fontSize: 13.5, fontWeight: 500,
        textDecoration: "none", transition: "background .2s var(--e-out), color .2s var(--e-out)",
      }}
    >
      {children}
    </Link>
  );
}
