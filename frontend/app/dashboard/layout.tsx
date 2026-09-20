import { redirect } from "next/navigation";
import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { ReactNode } from "react";
import LangSwitcher from "@/components/LangSwitcher";
import DashboardSidebar from "@/components/DashboardSidebar";
import NavLink from "@/components/NavLink";
import CommandPalette from "@/components/CommandPalette";
import { IconOverview, IconPhone, IconCalendar, IconGear, IconSupport } from "@/components/icons";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, business } = await getAuthedBusiness();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = DASH_T[locale];

  const initial = business?.name?.[0] || user.email?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex" }}>
      <DashboardSidebar>
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
          <NavLink href="/dashboard/support"><IconSupport width={17} height={17} />{t.navSupport}</NavLink>
          <NavLink href="/dashboard/settings"><IconGear width={17} height={17} />{t.navSettings}</NavLink>
          <a href="/?marketing=1"
            className="nav-link"
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
              marginTop: 8, paddingTop: 18, borderTop: "1px solid var(--hair)",
              borderRadius: 10, fontSize: 13.5, fontWeight: 500, textDecoration: "none",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
            </svg>
            {t.navHome}
          </a>
        </div>

        {/* What the product is doing for this business, pinned to the foot of
            the sidebar. Informational only (not a live status indicator). */}
        <div className="ai-card">
          <span className="ai-card-ic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="18.6" cy="5.4" r="2.85" fill="currentColor" />
            </svg>
          </span>
          <span className="ai-card-tx">
            <b>{t.aiTitle}</b>
            <span>{t.aiSub}</span>
          </span>
        </div>
      </DashboardSidebar>

      <div role="main" className="dash-main" style={{ flex: 1 }}>
        <div style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14,
          padding: "14px 28px", borderBottom: "1px solid var(--hair)",
        }}>
          <CommandPalette
            items={[
              { href: "/dashboard", label: t.navOverview },
              { href: "/dashboard/calls", label: t.navCalls },
              { href: "/dashboard/calendar", label: t.navCalendar },
              { href: "/dashboard/support", label: t.navSupport },
              { href: "/dashboard/settings", label: t.navSettings },
              { href: "/?marketing=1", label: t.navHome },
            ]}
            placeholder={t.cmdPlaceholder} empty={t.cmdEmpty} openLabel={t.cmdOpen}
          />
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
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                {business?.name || user.email}
              </p>
              <p style={{ fontSize: 11, lineHeight: 1.25, color: "var(--text-3)" }}>{t.bizAccount}</p>
            </div>
          </div>
        </div>
        {children}
      </div>

      <style>{`
        .nav-link { color: var(--text-2); position: relative; }
        .nav-link:hover { background: rgba(255,255,255,.055); color: var(--text); }
        .nav-link.active { background: rgba(55,226,155,.1); color: var(--jade); }
        .nav-link.active::before { content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--jade); box-shadow: 0 0 12px rgba(55,226,155,.5); }
        /* a faint jade glow in two corners, so the page isn't flat black */
        .dash-main {
          margin-left: 248px;
          background:
            radial-gradient(52% 38% at 96% 0%, rgba(18,185,129,.10), transparent 70%),
            radial-gradient(46% 36% at 0% 100%, rgba(18,185,129,.07), transparent 70%);
        }
        .ai-card {
          margin: 8px 12px 14px; padding: 12px; border-radius: 14px; display: flex; align-items: center; gap: 11px;
          background: linear-gradient(180deg, rgba(18,185,129,.09), rgba(255,255,255,.015));
          border: 1px solid rgba(55,226,155,.2);
        }
        .ai-card-ic {
          width: 34px; height: 34px; border-radius: 50%; flex: none; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.1); border: 1px solid rgba(55,226,155,.28);
        }
        .ai-card-tx { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .ai-card-tx b { font-size: 12.5px; font-weight: 600; }
        .ai-card-tx span { font-size: 11px; color: var(--text-3); line-height: 1.3; }
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
