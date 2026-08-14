import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import CalendarClient from "@/components/CalendarClient";
import BookingActions from "@/components/BookingActions";

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

  // Fetch urgencies in a separate query and merge in code -- avoids a fragile
  // embedded PostgREST join, and degrades gracefully (no urgency dot) if the
  // calls read fails for any reason rather than crashing the whole page.
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

  return (
    <div style={{ padding: 32, maxWidth: 1180 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.calTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13 }}>{t.calSub}</p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 18, fontSize: 11.5, color: "var(--text-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 3, borderRadius: 2, background: "#FFC178" }} />
          {t.calPending}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 3, borderRadius: 2, background: "var(--jade)" }} />
          {t.calConfirmed}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 3, borderRadius: 2, background: "#FF6B6B" }} />
          {t.detailUrgency}
        </span>
      </div>

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
        labels={{
          calSelectDay: t.calSelectDay,
          calDayEmpty: t.calDayEmpty,
          calConfirm: t.calConfirm,
          calConfirming: t.calConfirming,
          calCancel: t.calCancel,
          calCancelling: t.calCancelling,
          calCancelled: t.calCancelled,
          calConfirmed_: t.calConfirmed_,
          calNoDate: t.calNoDate,
          unknown: t.unknown,
        }}
      />

      {undatedBookings.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t.calUndatedTitle}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {undatedBookings.map((b: any) => (
              <div key={b.id} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--hair)", background: "rgba(255,255,255,.024)" }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{b.customer_name || t.unknown}</p>
                <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 10 }}>
                  {b.notes || t.calNoDate}
                  {b.party_size ? ` · ${t.people(b.party_size)}` : ""}
                  {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                </p>
                {b.status === "pending" && (
                  <BookingActions
                    bookingId={b.id} path="/dashboard/calendar"
                    confirmLabel={t.calConfirm} confirmingLabel={t.calConfirming}
                    cancelLabel={t.calCancel} cancellingLabel={t.calCancelling}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
