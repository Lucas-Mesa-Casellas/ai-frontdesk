import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import ConfirmButton from "@/components/ConfirmButton";

type Booking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  booking_type: string | null; party_size: number | null; notes: string | null;
  status: string; created_at: string;
};

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const { data: business } = await supabase
    .from("businesses").select("id").eq("owner_id", user!.id).single();

  const { data: bookings } = await supabase
    .from("bookings").select("*").eq("business_id", business?.id)
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: 40, maxWidth: 780 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.calTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.calSub}</p>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 22, fontSize: 12, color: "var(--text-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, border: "1.5px dashed #FFC178" }} />
          {t.calPending}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: "var(--jade-deep)", border: "1.5px solid var(--jade)" }} />
          {t.calConfirmed}
        </span>
      </div>

      {!bookings?.length ? (
        <div style={{ textAlign: "center", padding: "56px 20px", border: "1px solid var(--hair)", borderRadius: 18, background: "rgba(255,255,255,.024)" }}>
          <p style={{ fontSize: 15, marginBottom: 6 }}>{t.calEmptyTitle}</p>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>{t.calEmptySub}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(bookings as Booking[]).map((b) => {
            const pending = b.status === "pending";
            return (
              <div
                key={b.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 16,
                  background: pending ? "rgba(255,193,120,.04)" : "rgba(18,185,129,.06)",
                  border: `1.5px ${pending ? "dashed rgba(255,193,120,.35)" : "solid rgba(55,226,155,.28)"}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{b.customer_name || t.unknown}</p>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)" }}>
                    {b.notes || t.calNoDate}
                    {b.party_size ? ` · ${t.people(b.party_size)}` : ""}
                  </p>
                  {b.customer_phone && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{b.customer_phone}</p>}
                </div>
                {pending ? (
                  <ConfirmButton bookingId={b.id} path="/dashboard/calendar" label={t.calConfirm} labelPending={t.calConfirming} />
                ) : (
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, color: "var(--jade)", flex: "none",
                    padding: "6px 12px", borderRadius: 999, background: "rgba(55,226,155,.1)",
                    border: "1px solid rgba(55,226,155,.24)",
                  }}>
                    {t.calConfirmed_}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
