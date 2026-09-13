import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { IconPhone, IconCalendar } from "@/components/icons";
import { BUSINESS_TZ, madridHour, zonedTimeToUtc } from "@/lib/tz";
 
export default async function OverviewPage() {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const businessId = business?.id;

  const [
    { count: totalCalls },
    { count: pendingBookings },
    { count: totalBookings },
    { data: recentCalls },
    { data: upcoming },
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
    supabase.from("calls").select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("bookings").select("*").eq("business_id", businessId)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false }).limit(4),
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
      <div className="dash-in" style={{ marginBottom: 28 }}>
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

      <div className="ov-content">
        <div className="dash-card dash-in d4 ov-panel">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>{t.recentCalls}</h2>
            <Link href="/dashboard/calls" className="ov-view-all" style={{ fontSize: 12, color: "var(--jade)", textDecoration: "none", fontWeight: 500 }}>{t.viewAll}</Link>
          </div>
          {!recentCalls?.length ? (
            <Empty text={t.noCalls} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentCalls.map((c) => (
                <div key={c.id} style={row}>
                  <IconIn><IconPhone width={13} height={13} /></IconIn>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <p style={rowTitle}>{c.caller_name || t.unknown}</p>
                      <span style={rowTime}>
                        {new Date(c.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}
                      </span>
                    </div>
                    <p style={rowSub}>{c.summary || t.noSummary}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dash-card dash-in d5 ov-panel">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
            <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>{t.upcoming}</h2>
            <Link href="/dashboard/calendar" className="ov-view-all" style={{ fontSize: 12, color: "var(--jade)", textDecoration: "none", fontWeight: 500 }}>{t.viewAll}</Link>
          </div>
          {!upcoming?.length ? (
            <Empty text={t.noUpcoming} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcoming.map((b) => (
                <div key={b.id} style={row}>
                  <IconIn><IconCalendar width={13} height={13} /></IconIn>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={rowTitle}>{b.customer_name || t.unknown}</p>
                    <p style={rowSub}>{b.notes || t.noDateSet}</p>
                  </div>
                  <StatusPill status={b.status} t={t} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dash-card dash-in d6 ov-panel" style={{ marginTop: 18 }}>
        <div style={{ marginBottom: 14 }}>
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
                  title={t.hourTooltip(hourLabel(h), count)}
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

      <style>{`
        .ov-wrap { padding: 28px 32px; max-width: 1080px; }
        .ov-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 28px; }
        .ov-stat-card { padding: 18px; }
        .ov-stat-num { font-size: 28px; }
        .ov-stat-label { font-size: 12px; }
        .ov-content { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .ov-panel { padding: 20px; }
        .ov-view-all { padding: 4px 8px; margin: -4px -8px; border-radius: 8px; transition: background .22s var(--e-out); }
        .ov-view-all:hover { background: rgba(255,255,255,.055); }
        .ov-hourbars { display: flex; align-items: flex-end; gap: 2px; height: 80px; border-bottom: 1px solid var(--hair); }
        .ov-hourbar { flex: 1; min-width: 3px; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, var(--jade), var(--jade-deep)); }
        .ov-hourlabels { display: flex; justify-content: space-between; margin-top: 6px; }
        .ov-hourlabels span { font-size: 9.5px; color: var(--text-3); }
        @media (max-width: 700px) {
          .ov-wrap { padding: 18px 16px; }
          .ov-content { grid-template-columns: 1fr; gap: 14px; }
        }
        @media (max-width: 480px) {
          .ov-stats { gap: 8px; }
          .ov-stat-card { padding: 12px; }
          .ov-stat-num { font-size: 20px; }
          .ov-stat-label { font-size: 10.5px; }
          .ov-panel { padding: 14px; }
          .ov-hourlabels span:nth-child(2n) { display: none; }
        }
      `}</style>
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
  borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.04)",
  textDecoration: "none", color: "inherit",
  transition: "background .22s var(--e-out), border-color .22s var(--e-out), transform .22s var(--e-out)",
};
const rowTitle: React.CSSProperties = { fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const rowSub: React.CSSProperties = { fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const rowTime: React.CSSProperties = { fontSize: 11.5, color: "var(--text-3)", flex: "none" };

function IconIn({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      width: 28, height: 28, borderRadius: "50%", flex: "none",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(55,226,155,.12)", color: "var(--jade)",
    }}>
      {children}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: "var(--text-3)", fontSize: 13 }}>{text}</p>;
}

function StatusPill({ status, t }: { status: string; t: typeof DASH_T.en }) {
  const isConfirmed = status === "confirmed";
  return (
    <span style={{
      fontSize: 11, padding: "4px 10px", borderRadius: 999, flex: "none",
      border: `1px solid ${isConfirmed ? "rgba(55,226,155,.28)" : "var(--hair-2)"}`,
      color: isConfirmed ? "var(--jade)" : "#FFC178",
      background: isConfirmed ? "rgba(55,226,155,.1)" : "transparent",
    }}>
      {isConfirmed ? t.calConfirmed_ : t.calPending}
    </span>
  );
}
