import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import CalendarClient from "@/components/CalendarClient";
import { BUSINESS_TZ, madridYMD, zonedTimeToUtc } from "@/lib/tz";
import { resolveTranslatable } from "@/lib/translate-helpers";

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
  const [nowYear, nowMonth1, nowDay] = madridYMD(now);
  let year = nowYear;
  let month = nowMonth1 - 1;
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const monthStart = new Date(Date.UTC(year, month, 1));
  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));

  // Unlike monthStart above (a UTC-native anchor used only for grid/label
  // arithmetic, where it doesn't matter), the query range must line up with
  // Madrid's actual month boundary -- see zonedTimeToUtc's doc comment.
  const queryStart = zonedTimeToUtc(year, month, 1);
  const queryEnd = zonedTimeToUtc(year, month + 1, 1);

  const { data: monthBookingsRaw } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .gte("start_time", queryStart.toISOString())
    .lt("start_time", queryEnd.toISOString())
    .order("start_time", { ascending: true });

  const { data: undatedBookingsRaw } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .is("start_time", null)
    .order("created_at", { ascending: false });

  const allRows = [...(monthBookingsRaw || []), ...(undatedBookingsRaw || [])];
  const callIds = allRows.map((b) => b.call_id).filter(Boolean);
  // bookings.notes actually stores extracted.preferred_time (the caller's
  // raw natural-language time phrase, e.g. "mañana tres de la tarde") --
  // set that way in backend/app/routers/webhooks.py's booking_record. It
  // is NOT a general reason/summary field despite the column name, so the
  // day-detail panel needs the linked call's own summary instead.
  const callInfoByCall: Record<string, { urgency: string | null; summary: string | null; translations: any }> = {};
  if (callIds.length) {
    const { data: callsData } = await supabase
      .from("calls").select("id, urgency, summary, translations").in("id", callIds);
    (callsData || []).forEach((c) => {
      callInfoByCall[c.id] = { urgency: c.urgency ?? null, summary: c.summary ?? null, translations: c.translations ?? {} };
    });
  }
  const businessLanguage = business?.language ?? "es";
  const withCallInfo = (rows: any[] | null) =>
    (rows || []).map((r) => {
      const info = r.call_id ? callInfoByCall[r.call_id] : null;
      const summaryResolved = resolveTranslatable(info?.summary ?? null, info?.translations, "summary", locale, businessLanguage);
      return {
        ...r,
        urgency: info?.urgency ?? null,
        summary: summaryResolved.text,
        summaryNeedsTranslation: summaryResolved.needsFetch,
      };
    });

  const monthBookings = withCallInfo(monthBookingsRaw);
  const undatedBookings = withCallInfo(undatedBookingsRaw);

  const byDay: Record<number, any[]> = {};
  monthBookings.forEach((b) => {
    if (!b.start_time) return;
    const [, , d] = madridYMD(new Date(b.start_time));
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
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: BUSINESS_TZ }).format(d);
  });

  const monthTitle = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: BUSINESS_TZ }).format(monthStart);
  const todayKey = `${nowYear}-${nowMonth1 - 1}-${nowDay}`;
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
            cancelled: t.calCancelled,
            urgency: t.detailUrgent,
          }}
          stats={{ total: monthBookings.length, confirmed: confirmedCount }}
          undated={undatedBookings.map((b: any) => ({
            id: b.id, customer_name: b.customer_name, customer_phone: b.customer_phone,
            summary: b.summary, summaryNeedsTranslation: b.summaryNeedsTranslation, status: b.status, call_id: b.call_id,
          }))}
          dashboardLocale={locale}
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
            calReason: t.calReason,
            calNoReason: t.calNoReason,
            calSeeCall: t.calSeeCall,
            calChange: t.calChange,
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
