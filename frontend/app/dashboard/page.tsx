import Link from "next/link";
import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import ConfirmButton from "@/components/ConfirmButton";

type Booking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  booking_type: string | null; party_size: number | null; notes: string | null;
  status: string; created_at: string; start_time: string | null; end_time: string | null;
};

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
  let month = now.getMonth(); // 0-indexed
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month + 1, 1));
  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));

  const { data: monthBookings } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .gte("start_time", monthStart.toISOString())
    .lt("start_time", monthEndExclusive.toISOString())
    .order("start_time", { ascending: true });

  const { data: undatedBookings } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .is("start_time", null)
    .order("created_at", { ascending: false });

  const byDay: Record<number, Booking[]> = {};
  (monthBookings as Booking[] | null)?.forEach((b) => {
    if (!b.start_time) return;
    const d = new Date(b.start_time).getUTCDate();
    (byDay[d] ||= []).push(b);
  });

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7; // 0=Monday
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i)); // a known Monday
    return new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(d);
  });

  const monthTitle = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric" }).format(monthStart);

  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const renderBooking = (b: Booking, compact = true) => {
    const pending = b.status === "pending";
    const time = b.start_time
      ? new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit" }).format(new Date(b.start_time))
      : null;
    return (
      <div
        key={b.id}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: compact ? "6px 8px" : 16,
          borderRadius: compact ? 8 : 16, marginBottom: 4,
          background: pending ? "rgba(255,193,120,.06)" : "rgba(18,185,129,.08)",
          border: `1px ${pending ? "dashed rgba(255,193,120,.35)" : "solid rgba(55,226,155,.28)"}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {time && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginRight: 6 }}>{time}</span>}
          <span style={{ fontSize: compact ? 12.5 : 14, fontWeight: 500 }}>{b.customer_name || t.unknown}</span>
          {!compact && (
            <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
              {b.notes || t.calNoDate}
              {b.party_size ? ` · ${t.people(b.party_size)}` : ""}
              {b.customer_phone ? ` · ${b.customer_phone}` : ""}
            </p>
          )}
        </div>
        {pending ? (
          <ConfirmButton bookingId={b.id} path="/dashboard/calendar" label={t.calConfirm} labelPending={t.calConfirming} />
        ) : (
          <span style={{
            fontSize: 10.5, fontWeight: 600, color: "var(--jade)", flex: "none",
            padding: "4px 9px", borderRadius: 999, background: "rgba(55,226,155,.1)",
            border: "1px solid rgba(55,226,155,.24)",
          }}>
            {t.calConfirmed_}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 40, maxWidth: 980 }}>
      <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.calTitle}</h1>
          <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.calSub}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href={`/dashboard/calendar?month=${monthKey(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth())}`}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 13, color: "var(--text-2)" }}
          >
            ‹
          </Link>
          <span style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize", minWidth: 140, textAlign: "center" }}>
            {monthTitle}
          </span>
          <Link
            href={`/dashboard/calendar?month=${monthKey(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth())}`}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 13, color: "var(--text-2)" }}
          >
            ›
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 18, fontSize: 12, color: "var(--text-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, border: "1.5px dashed #FFC178" }} />
          {t.calPending}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--jade-deep)", border: "1.5px solid var(--jade)" }} />
          {t.calConfirmed}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 30 }}>
        {weekdayLabels.map((w) => (
          <div key={w} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textAlign: "center", textTransform: "uppercase", padding: "0 0 4px" }}>
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday = day !== null && todayKey === `${year}-${month}-${day}`;
          return (
            <div
              key={i}
              style={{
                minHeight: 92, borderRadius: 10, padding: 6,
                border: `1px solid ${isToday ? "var(--jade)" : "var(--hair)"}`,
                background: day === null ? "transparent" : "rgba(255,255,255,.018)",
              }}
            >
              {day !== null && (
                <>
                  <span style={{ fontSize: 11, color: isToday ? "var(--jade)" : "var(--text-3)", fontWeight: isToday ? 700 : 500 }}>
                    {day}
                  </span>
                  <div style={{ marginTop: 4 }}>
                    {(byDay[day] || []).map((b) => renderBooking(b, true))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {undatedBookings && undatedBookings.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{t.calUndatedTitle}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(undatedBookings as Booking[]).map((b) => renderBooking(b, false))}
          </div>
        </div>
      )}
    </div>
  );
}
