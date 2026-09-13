import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import CalendarClient from "@/components/CalendarClient";

const INTL_LOCALE: Record<string, string> = { en: "en-US", es: "es-ES", fr: "fr-FR" };

function pad(n: number) { return String(n).padStart(2, "0"); }
function monthKey(year: number, month: number) { return `${year}-${pad(month + 1)}`; }

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];
  const intlLocale = INTL_LOCALE[locale] || "en-US";

  const sp = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month + 1, 1));
  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));

  const { data: monthBookingsRaw } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .gte("start_time", monthStart.toISOString())
    .lt("start_time", monthEndExclusive.toISOString())
    .order("start_time", { ascending: true });

  const { data: undatedBookingsRaw } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .is("start_time", null)
    .order("created_at", { ascending: false });

  const allRows = [...(monthBookingsRaw || []), ...(undatedBookingsRaw || [])];
  const callIds = allRows.map((b) => b.call_id).filter(Boolean);
  const urgencyByCall: Record<string, string | null> = {};
  if (callIds.length) {
    const { data: callsData } = await supabase
      .from("calls").select("id, urgency").in("id", callIds);
    (callsData || []).forEach((c) => { urgencyByCall[c.id] = c.urgency ?? null; });
  }
  const withUrgency = (rows: any[] | null) =>
    (rows || []).map((r) => ({ ...r, urgency: r.call_id ? urgencyByCall[r.call_id] ?? null : null }));

  const monthBookings = withUrgency(monthBookingsRaw);
  const undatedBookings = withUrgency(undatedBookingsRaw);

  const byDay: Record<number, any[]> = {};
  monthBookings.forEach((b) => {
    if (!b.start_time) return;
    const d = new Date(b.start_time).getUTCDate();
    (byDay[d] ||= []).push(b);
  });

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(d);
  });

  const monthTitle = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(monthStart);
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const confirmedCount = monthBookings.filter((b: any) => b.status === "confirmed").length;

  return (
    <div className="cal-page">
      <div className="dash-in" style={{ marginBottom: 10, flex: "none" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 2 }}>{t.calTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 12.5 }}>{t.calSub}</p>
      </div>

      <div className="dash-card dash-in d1 cal-page-card">
        <CalendarClient
          cells={cells}
          byDay={byDay}
          weekdayLabels={weekdayLabels}
          monthTitle={monthTitle}
          todayKey={todayKey}
          year={year}
          month={month}
          prevHref={`/dashboard/calendar?month=${monthKey(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth())}`}
          nextHref={`/dashboard/calendar?month=${monthKey(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth())}`}
          intlLocale={intlLocale}
          legend={{
            pending: t.calPending,
            confirmed: t.calConfirmed,
            urgency: t.detailUrgency,
          }}
          stats={{ total: monthBookings.length, confirmed: confirmedCount }}
          undated={undatedBookings.map((b: any) => ({
            id: b.id, customer_name: b.customer_name, customer_phone: b.customer_phone,
            notes: b.notes, status: b.status,
          }))}
          labels={{
            calSelectDay: t.calSelectDay,
            calDayEmpty: t.calDayEmpty,
            calConfirm: t.calConfirm,
            calConfirming: t.calConfirming,
            calCancel: t.calCancel,
            calCancelling: t.calCancelling,
            calCancelled: t.calCancelled,
            calConfirmed_: t.calConfirmed_,
            calActionError: t.calActionError,
            calNoDate: t.calNoDate,
            calUndatedTitle: t.calUndatedTitle,
            unknown: t.unknown,
            statThisMonth: t.calStatsThisMonth,
            statConfirmed: t.calConfirmed,
          }}
        />
      </div>

      <style>{`
        .cal-page { height: calc(100vh - 76px); display: flex; flex-direction: column; padding: 16px 24px; max-width: 1180px; }
        .cal-page-card { padding: 14px; flex: 1; min-height: 0; display: flex; }
        @media (max-width: 700px) {
          .cal-page { height: auto; padding: 14px; }
          .cal-page-card { flex: none; min-height: 0; }
        }
      `}</style>
    </div>
  );
}
