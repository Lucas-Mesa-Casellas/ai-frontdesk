import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { IconPhone, IconCalendar } from "@/components/icons";

export default async function OverviewPage() {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const businessId = business?.id;

  const [
    { count: totalCalls },
    { count: pendingBookings },
    { data: recentCalls },
    { data: upcoming },
  ] = await Promise.all([
    supabase.from("calls").select("*", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("business_id", businessId).eq("status", "pending"),
    supabase.from("calls").select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(5),
    supabase.from("bookings").select("*").eq("business_id", businessId)
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false }).limit(4),
  ]);

  const conv = totalCalls ? Math.round(((pendingBookings || 0) / totalCalls) * 100) : 0;

  return (
    <div style={{ padding: 40, maxWidth: 1080 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.ovTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.ovSub}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard label={t.statCalls} value={totalCalls || 0} />
        <StatCard label={t.statBookings} value={pendingBookings || 0} highlight />
        <StatCard label={t.statConv} value={`${conv}%`} sub={t.statConvGoal} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Panel title={t.recentCalls} link="/dashboard/calls" linkLabel={t.viewAll}>
          {!recentCalls?.length ? (
            <Empty text={t.noCalls} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentCalls.map((c) => (
                <Link key={c.id} href={`/dashboard/calls/${c.id}`} style={row}>
                  <IconIn><IconPhone width={13} height={13} /></IconIn>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <p style={rowTitle}>{c.caller_name || t.unknown}</p>
                      <span style={rowTime}>
                        {new Date(c.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p style={rowSub}>{c.summary || t.noSummary}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t.upcoming} link="/dashboard/calendar" linkLabel={t.viewAll}>
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
        </Panel>
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
  borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.04)",
  textDecoration: "none", color: "inherit",
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

function Panel({ title, link, linkLabel, children }: { title: string; link: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)",
      borderRadius: 18, padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
          {title}
        </h2>
        <Link href={link} style={{ fontSize: 12, color: "var(--jade)", textDecoration: "none" }}>{linkLabel}</Link>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      padding: 18, borderRadius: 16,
      border: `1px solid ${highlight ? "rgba(55,226,155,.26)" : "var(--hair)"}`,
      background: highlight
        ? "linear-gradient(180deg,rgba(18,185,129,.09),rgba(255,255,255,.016) 58%)"
        : "rgba(255,255,255,.032)",
    }}>
      <p style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 12, color: "var(--text-3)" }}>{label}{sub ? ` · ${sub}` : ""}</p>
    </div>
  );
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
