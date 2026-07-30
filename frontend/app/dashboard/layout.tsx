import { redirect } from "next/navigation";
import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { ReactNode } from "react";
import LangSwitcher from "@/components/LangSwitcher";
import DashboardSidebar from "@/components/DashboardSidebar";
import { IconOverview, IconPhone, IconCalendar, IconGear, IconArrowLeft } from "@/components/icons";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, business } = await getAuthedBusiness();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = DASH_T[locale];

  const initial = business?.name?.[0] || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex" }}>
      <DashboardSidebar>
        <div style={{ padding: "22px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          
            href="/"
            aria-label="Back to website"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 8, color: "var(--text-3)",
              border: "1px solid var(--hair)", background: "rgba(255,255,255,.03)",
              flex: "none",
            }}
          >
            <IconArrowLeft width={14} height={14} />
          </a>
        </div>

        <div role="navigation" aria-label="Dashboard" style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          <NavLink href="/dashboard"><IconOverview width={17} height={17} />{t.navOverview}</NavLink>
          <NavLink href="/dashboard/calls"><IconPhone width={17} height={17} />{t.navCalls}</NavLink>
          <NavLink href="/dashboard/calendar"><IconCalendar width={17} height={17} />{t.navCalendar}</NavLink>
          <NavLink href="/dashboard/settings"><IconGear width={17} height={17} />{t.navSettings}</NavLink>
        </div>
      </DashboardSidebar>

      <div role="main" className="dash-main" style={{ flex: 1 }}>
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14,
          padding: "14px 28px", borderBottom: "1px solid var(--hair)",
        }}>
          <LangSwitcher current={locale} />
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "7px 12px 7px 7px",
            borderRadius: 999, background: "rgba(255,255,255,.035)", border: "1px solid var(--hair)",
          }}>
            <span style={{
              width: 26, height: 26, borderRadius: "50%", flex: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(155deg,var(--jade),var(--jade-deep))",
              color: "#04140D", fontSize: 11.5, fontWeight: 700,
            }}>
              {initial}
            </span>
            <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
              {business?.name || user.email}
            </p>
          </div>
        </div>
        {children}
      </div>

      <style>{`
        .nav-link:hover { background: rgba(255,255,255,.055); color: var(--text); }
        .dash-main { margin-left: 248px; }
        .dash-aside {
          width: 248px; border-right: 1px solid var(--hair); background: rgba(255,255,255,.018);
          display: flex; flex-direction: column; position: fixed; height: 100%; z-index: 35;
          transition: transform .3s var(--e-out);
        }
        .sidebar-toggle { display: none; }
        .sidebar-scrim { display: none; }
        @media (max-width: 1000px) {
          .dash-aside { transform: translateX(-100%); box-shadow: 24px 0 48px -24px rgba(0,0,0,.55); background: var(--bg); }
          .dash-aside.open { transform: translateX(0); }
          .dash-main { margin-left: 0; }
          .sidebar-toggle {
            display: flex; align-items: center; justify-content: center;
            position: fixed; top: 14px; left: 14px; z-index: 40;
            width: 34px; height: 34px; border-radius: 10px;
            background: rgba(255,255,255,.06); border: 1px solid var(--hair);
            color: var(--text);
          }
          .sidebar-scrim {
            display: block; position: fixed; inset: 0; z-index: 25;
            background: rgba(0,0,0,.5);
          }
        }
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
