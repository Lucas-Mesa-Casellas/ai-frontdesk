import { createClient } from "@/lib/supabase-server";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconPhone } from "@/components/icons";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const { data: call } = await supabase
    .from("calls").select("*, bookings(*)").eq("id", id).single();
  if (!call) notFound();

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)", borderRadius: 18,
  };
  const field: React.CSSProperties = {
    padding: 14, borderRadius: 12, background: "rgba(255,255,255,.028)", border: "1px solid rgba(255,255,255,.04)",
  };
  const fieldLabel: React.CSSProperties = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 4 };

  return (
    <div style={{ padding: 40, maxWidth: 680 }}>
      <Link href="/dashboard/calls" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)", textDecoration: "none", marginBottom: 22 }}>
        <IconArrowLeft width={14} height={14} /> {t.back}
      </Link>

      <div style={{ ...card, padding: 24, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 42, height: 42, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(55,226,155,.1)", border: "1px solid rgba(55,226,155,.22)", color: "var(--jade)",
            }}>
              <IconPhone width={17} height={17} />
            </span>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600 }}>{call.caller_name || t.unknown}</h1>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>{call.caller_phone || t.noPhone}</p>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={field}>
            <p style={fieldLabel}>{t.detailDate}</p>
            <p style={{ fontSize: 13.5, fontWeight: 500 }}>
              {new Date(call.created_at).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div style={field}>
            <p style={fieldLabel}>{t.detailTime}</p>
            <p style={{ fontSize: 13.5, fontWeight: 500 }}>
              {new Date(call.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          {call.preferred_time && (
            <div style={{ ...field, background: "rgba(55,226,155,.07)", borderColor: "rgba(55,226,155,.18)" }}>
              <p style={{ ...fieldLabel, color: "var(--jade)" }}>{t.detailRequested}</p>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--jade)" }}>{call.preferred_time}</p>
            </div>
          )}
          {call.urgency && call.urgency !== "normal" && (
            <div style={{ ...field, background: "rgba(255,193,120,.07)", borderColor: "rgba(255,193,120,.18)" }}>
              <p style={{ ...fieldLabel, color: "#FFC178" }}>{t.detailUrgency}</p>
              <p style={{ fontSize: 13.5, fontWeight: 500, color: "#FFC178" }}>{call.urgency}</p>
            </div>
          )}
        </div>

        {call.summary && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.detailSummary}</h2>
            <p style={{ ...field, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>{call.summary}</p>
          </div>
        )}

        {call.transcript && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t.detailTranscript}</h2>
            <div style={{ ...field, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, maxHeight: 340, overflowY: "auto" }}>
              {call.transcript.split("\n").map((line: string, i: number) => (
                <p key={i} style={{ marginBottom: 8 }}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {call.bookings?.length > 0 && (
        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t.detailBooking}</h2>
          {call.bookings.map((b: { id: string; customer_name?: string; booking_type?: string; status: string }) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "rgba(255,255,255,.03)" }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 500 }}>{b.customer_name || call.caller_name}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>{b.booking_type} · {b.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
