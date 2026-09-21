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
    <div className="dash-shell">
      <DashboardSidebar>
        <div className="dash-brand">
          <span className="dash-brand-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="18.6" cy="5.4" r="2.85" fill="#04140D" />
            </svg>
          </span>
          <span className="dash-brand-name">LMC Agents</span>
        </div>

        <div role="navigation" aria-label="Dashboard" className="dash-nav">
          <NavLink href="/dashboard"><IconOverview width={17} height={17} />{t.navOverview}</NavLink>
          <NavLink href="/dashboard/calls"><IconPhone width={17} height={17} />{t.navCalls}</NavLink>
          <NavLink href="/dashboard/calendar"><IconCalendar width={17} height={17} />{t.navCalendar}</NavLink>
          <NavLink href="/dashboard/support"><IconSupport width={17} height={17} />{t.navSupport}</NavLink>
          <NavLink href="/dashboard/settings"><IconGear width={17} height={17} />{t.navSettings}</NavLink>

          <div className="nav-sep" aria-hidden="true" />
          <a href="/?marketing=1" className="nav-link">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
            </svg>
            {t.navHome}
          </a>
        </div>

        {/* What the product is doing for this business, pinned to the foot of
            the sidebar as a permanent part of the shell. Informational: the
            app has no live status feed, so it makes no "online" claim. */}
        <div className="ai-card">
          <span className="ai-card-ic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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

      <div role="main" className="dash-main">
        <div className="dash-topbar">
          <div className="dash-topbar-left">
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
          </div>
          <div className="dash-topbar-right">
            <LangSwitcher current={locale} />
            <div className="dash-account">
              <span className="dash-account-avatar">{initial}</span>
              <div className="dash-account-tx">
                <p className="dash-account-name">{business?.name || user.email}</p>
                <p className="dash-account-sub">{t.bizAccount}</p>
              </div>
            </div>
          </div>
        </div>
        {children}
      </div>

      <style>{`
        .dash-shell { min-height: 100vh; display: flex; background: var(--bg); color: var(--text); }

        /* ---------- sidebar ---------- */
        .dash-aside {
          width: 248px; display: flex; flex-direction: column; position: fixed; height: 100%; z-index: 35;
          background:
            radial-gradient(120% 34% at 0% 0%, rgba(18,185,129,.06), transparent 70%),
            var(--surface);
          border-right: 1px solid var(--border);
          transition: transform .3s var(--e-out);
        }
        .dash-brand { display: flex; align-items: center; gap: 11px; padding: 22px 20px 16px; }
        .dash-brand-mark {
          width: 30px; height: 30px; border-radius: 9px; flex: none; display: grid; place-items: center;
          background: linear-gradient(155deg, var(--jade), var(--jade-deep));
          box-shadow: 0 10px 22px -10px rgba(18,185,129,.7), inset 0 1px 0 rgba(255,255,255,.3);
        }
        .dash-brand-name { font-size: 15px; font-weight: 600; letter-spacing: -.012em; }
        .dash-nav { flex: 1; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; }
        .nav-sep { height: 1px; margin: 10px 8px 8px; background: var(--border); }

        /* Quiet by default; the active page is the only thing that lights up. */
        .nav-link {
          position: relative; display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 11px; font-size: 13.5px; font-weight: 500;
          color: var(--text-3); text-decoration: none;
          border: 1px solid transparent;
          transition: background .2s var(--e-out), color .2s var(--e-out), border-color .2s var(--e-out), box-shadow .2s var(--e-out);
        }
        .nav-link:hover { background: rgba(255,255,255,.04); color: var(--text); }
        .nav-link.active {
          color: var(--jade); background: rgba(55,226,155,.085); border-color: rgba(55,226,155,.16);
          box-shadow: 0 0 26px -16px rgba(55,226,155,.7);
        }
        .nav-link.active::before {
          content: ""; position: absolute; left: -13px; top: 10px; bottom: 10px; width: 3px;
          border-radius: 0 3px 3px 0; background: var(--jade); box-shadow: 0 0 12px rgba(55,226,155,.55);
        }

        .ai-card {
          margin: 10px 12px 16px; padding: 13px; border-radius: 14px; display: flex; align-items: center; gap: 12px;
          background:
            linear-gradient(180deg, rgba(18,185,129,.10), rgba(255,255,255,.012)),
            var(--surface-2);
          border: 1px solid var(--border-jade);
          box-shadow: var(--glow-jade);
        }
        .ai-card-ic {
          width: 38px; height: 38px; border-radius: 12px; flex: none; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.10); border: 1px solid rgba(55,226,155,.28);
        }
        .ai-card-tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .ai-card-tx b { font-size: 13px; font-weight: 600; letter-spacing: -.005em; }
        .ai-card-tx span { font-size: 11.5px; color: var(--text-3); line-height: 1.3; }

        .sidebar-toggle { display: none; }
        .sidebar-scrim { display: none; }

        /* ---------- main column + top bar ---------- */
        /* a faint jade glow in two corners, so the page isn't flat black */
        .dash-main {
          flex: 1; min-width: 0; margin-left: 248px;
          background:
            radial-gradient(52% 38% at 96% 0%, rgba(18,185,129,.10), transparent 70%),
            radial-gradient(46% 36% at 0% 100%, rgba(18,185,129,.07), transparent 70%);
        }
        /* Height stays at 68px: the Calls and Calendar pages size their fixed
           shells as calc(100vh - 76px) and rely on the bar being no taller. */
        .dash-topbar {
          height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 14px;
          padding: 0 32px; border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255,255,255,.02), transparent);
        }
        .dash-topbar-left, .dash-topbar-right { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .dash-account {
          display: flex; align-items: center; gap: 10px; min-width: 0; height: 44px;
          padding: 0 16px 0 6px; border-radius: 999px;
          background: var(--surface); border: 1px solid var(--border);
        }
        .dash-account-avatar {
          width: 32px; height: 32px; border-radius: 50%; flex: none; display: grid; place-items: center;
          background: linear-gradient(155deg, var(--jade), var(--jade-deep));
          color: #04140D; font-size: 12.5px; font-weight: 700;
          box-shadow: 0 8px 18px -8px rgba(18,185,129,.7);
        }
        .dash-account-tx { min-width: 0; }
        .dash-account-name { font-size: 13px; font-weight: 600; line-height: 1.25; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dash-account-sub { font-size: 11px; line-height: 1.25; color: var(--text-3); }

        @media (max-width: 1000px) {
          .dash-aside { transform: translateX(-100%); box-shadow: 24px 0 48px -24px rgba(0,0,0,.55); background: var(--bg); }
          .dash-aside.open { transform: translateX(0); }
          .dash-main { margin-left: 0; }
          .nav-link.active::before { left: -12px; }
          .sidebar-toggle {
            display: flex; align-items: center; justify-content: center;
            position: fixed; top: 17px; left: 14px; z-index: 40;
            width: 34px; height: 34px; border-radius: 10px;
            background: var(--surface-2); border: 1px solid var(--border);
            color: var(--text);
          }
          .sidebar-scrim {
            display: block; position: fixed; inset: 0; z-index: 25;
            background: rgba(0,0,0,.5);
          }
          /* clear of the fixed menu button on the left */
          .dash-topbar { padding: 0 16px 0 60px; }
        }
        @media (max-width: 560px) {
          .dash-topbar { gap: 8px; }
          .dash-topbar-right { gap: 8px; }
          .dash-account { padding-right: 12px; }
          .dash-account-name { max-width: 88px; }
          .dash-account-sub { display: none; }
        }
      `}</style>
    </div>
  );
}
