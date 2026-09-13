import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { IconPhone } from "@/components/icons";
import { BUSINESS_TZ } from "@/lib/tz";

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  reservation_requested: { bg: "rgba(55,226,155,.1)", border: "rgba(55,226,155,.24)", color: "var(--jade)" },
  needs_review: { bg: "rgba(255,193,120,.1)", border: "rgba(255,193,120,.24)", color: "#FFC178" },
};

export default async function CallsPage() {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const { data: calls } = await supabase
    .from("calls").select("*").eq("business_id", business?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="calls-wrap">
      <div className="dash-in" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.callsTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.callsSub}</p>
      </div>

      {!calls?.length ? (
        <div style={{ textAlign: "center", padding: "56px 20px", border: "1px solid var(--hair)", borderRadius: 18, background: "rgba(255,255,255,.024)" }}>
          <p style={{ fontSize: 15, marginBottom: 6 }}>{t.callsEmptyTitle}</p>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>{t.callsEmptySub}</p>
        </div>
      ) : (
         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {calls.map((c, i) => {
            const s = STATUS_STYLE[c.status] || STATUS_STYLE.needs_review;
            const delayClass = `d${Math.min(i + 1, 6)}`;
            return (
              <Link
                key={c.id}
                href={`/dashboard/calls/${c.id}`}
                className={`dash-card ${delayClass} dash-in call-card`}
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <div className="call-card-head" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", rowGap: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: "50%", flex: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(55,226,155,.1)", border: "1px solid rgba(55,226,155,.2)", color: "var(--jade)",
                    }}>
                      <IconPhone width={14} height={14} />
                    </span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{c.caller_name || t.unknown}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)" }}>{c.caller_phone || t.noPhone}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(c.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: BUSINESS_TZ })}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(c.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}
                    </p>
                  </div>
                </div>
                {c.summary && (
                  <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10, lineHeight: 1.5 }}>{c.summary}</p>
                )}
                <span style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 999,
                  background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                }}>
                  {c.status?.replace(/_/g, " ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        .calls-wrap { padding: 28px 32px; max-width: 760px; }
        .call-card { padding: 18px; }
        @media (max-width: 700px) {
          .calls-wrap { padding: 18px 16px; }
        }
        @media (max-width: 480px) {
          .call-card { padding: 14px; }
          .call-card-head { gap: 8px; }
        }
      `}</style>
    </div>
  );
}
