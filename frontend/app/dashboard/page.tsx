import Link from "next/link";
import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { BUSINESS_TZ, madridHour, zonedTimeToUtc } from "@/lib/tz";
import { IconPhone, IconCalendar } from "@/components/icons";
 
export default async function OverviewPage() {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const businessId = business?.id;

  const [
    { count: totalCalls },
    { count: pendingBookings },
    { count: totalBookings },
    { data: allCallTimes },
  ] = await Promise.all([
    supabase.from("calls").select("*", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("business_id", businessId).eq("status", "pending"),
    // Any booking ever created counts as "this call resulted in a request,"
    // regardless of what later happened to it -- unlike pendingBookings
    // above, this must NOT filter by status, or confirming/cancelling a
    // booking would make the conversion rate go down for having done so.
    supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("business_id", businessId),
    supabase.from("calls").select("created_at").eq("business_id", businessId),
  ]);

  const conv = totalCalls ? Math.round(((totalBookings || 0) / totalCalls) * 100) : 0;

  const hourCounts = Array(24).fill(0);
  (allCallTimes || []).forEach((c) => { hourCounts[madridHour(new Date(c.created_at))]++; });
  const maxHourCount = Math.max(1, ...hourCounts);
  const hourLabel = (h: number) =>
    zonedTimeToUtc(2024, 0, 1, h).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ });
  const axisHours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="ov-wrap">
      <div className="ov-wave" aria-hidden="true" />

      <div className="dash-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>{t.ovTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="live-dot" />
          {t.ovSub}
        </p>
      </div>

      <div className="ov-stats">
        <div className="dash-card dash-in d1 ov-stat-card">
          <p className="ov-stat-num" style={{ fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1 }}>{totalCalls ?? 0}</p>
          <p className="ov-stat-label" style={{ color: "var(--text-3)" }}>{t.statCalls}</p>
        </div>

        <div className="dash-card dash-card-highlight dash-in d2 ov-stat-card">
          <p className="ov-stat-num" style={{ fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1 }}>{pendingBookings ?? 0}</p>
          <p className="ov-stat-label" style={{ color: "var(--text-3)" }}>{t.statBookings}</p>
        </div>

        <div className="dash-card dash-in d3 ov-stat-card">
          <p className="ov-stat-num" style={{ fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1 }}>{conv}%</p>
          <p className="ov-stat-label" style={{ color: "var(--text-3)" }}>{t.statConv}</p>
        </div>
      </div>

      <div className="dash-card dash-in d4 ov-panel">
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>{t.hourChartTitle}</h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{t.hourChartSub}</p>
        </div>
        {!totalCalls ? (
          <Empty text={t.noCalls} />
        ) : (
          <>
            <div className="ov-hourbars">
              {hourCounts.map((count, h) => (
                <div
                  key={h}
                  className="ov-hourbar"
                  title={t.chartTooltip(hourLabel(h), count)}
                  style={{ height: count > 0 ? `${Math.max((count / maxHourCount) * 100, 8)}%` : 2 }}
                />
              ))}
            </div>
            <div className="ov-hourlabels">
              {axisHours.map((h) => (
                <span key={h}>{hourLabel(h)}</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ov-nav-links">
        <Link href="/dashboard/calls" className="dash-card dash-in d5 ov-nav-link">
          <IconPhone width={16} height={16} />
          {t.navCalls}
        </Link>
        <Link href="/dashboard/calendar" className="dash-card dash-in d6 ov-nav-link">
          <IconCalendar width={16} height={16} />
          {t.navCalendar}
        </Link>
      </div>

      <style>{`
        .ov-wrap { position: relative; padding: 32px 36px; max-width: 1080px; isolation: isolate; }
        .ov-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 32px; }
        .ov-stat-card { position: relative; padding: 20px; }
        .ov-stat-card::after {
          content: ""; position: absolute; inset: -14px; border-radius: inherit;
          background: radial-gradient(circle at 50% 35%, rgba(55,226,155,.22), transparent 70%);
          opacity: .3; z-index: -1; pointer-events: none;
        }
        .ov-stat-num { font-size: 28px; }
        .ov-stat-label { font-size: 12px; }
        .ov-panel { padding: 24px; }
        .ov-hourbars { display: flex; align-items: flex-end; gap: 2px; height: 80px; border-bottom: 1px solid var(--hair); }
        .ov-hourbar { flex: 1; min-width: 3px; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, var(--jade), var(--jade-deep)); }
        .ov-hourlabels { display: flex; justify-content: space-between; margin-top: 6px; }
        .ov-hourlabels span { font-size: 9.5px; color: var(--text-3); }
        .ov-nav-links { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
        .ov-nav-link {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 16px; font-size: 13.5px; font-weight: 600; color: var(--text-2);
          text-decoration: none;
        }
        .ov-wave {
          position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
          overflow: hidden; pointer-events: none; z-index: -1;
        }
        .ov-wave::after {
          content: ""; position: absolute; top: 0; left: 0; width: 45%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(55,226,155,.55), transparent);
          filter: blur(3px);
          box-shadow: 0 0 18px 3px rgba(55,226,155,.22);
          animation: ovWaveTravel 4.5s ease-in-out 1 forwards;
        }
        @keyframes ovWaveTravel {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @media (max-width: 700px) {
          .ov-wrap { padding: 20px 18px; }
        }
        @media (max-width: 480px) {
          .ov-stats { gap: 8px; }
          .ov-stat-card { padding: 12px; }
          .ov-stat-num { font-size: 20px; }
          .ov-stat-label { font-size: 10.5px; }
          .ov-panel { padding: 14px; }
          .ov-hourlabels span:nth-child(2n) { display: none; }
          .ov-nav-links { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ov-wave::after { animation: none; }
        }
      `}</style>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: "var(--text-3)", fontSize: 13 }}>{text}</p>;
}
