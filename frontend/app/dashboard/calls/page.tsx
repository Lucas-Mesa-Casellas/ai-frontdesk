import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { IconPhone } from "@/components/icons";

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
    <div style={{ padding: 40, maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
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
          {calls.map((c) => {
            const s = STATUS_STYLE[c.status] || STATUS_STYLE.needs_review;
            return (
              <Link
                key={c.id}
                href={`/dashboard/calls/${c.id}`}
                style={{
                  display: "block", padding: 18, borderRadius: 16, textDecoration: "none", color: "inherit",
                  background: "rgba(255,255,255,.032)", border: "1px solid var(--hair)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: "50%",
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
                      {new Date(c.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(c.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
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
    </div>
  );
}
