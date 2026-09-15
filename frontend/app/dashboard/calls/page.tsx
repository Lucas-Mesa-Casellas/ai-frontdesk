import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconPhone } from "@/components/icons";
import { BUSINESS_TZ, zonedTimeToUtc } from "@/lib/tz";
import { resolveTranslatable } from "@/lib/translate-helpers";
import TranslatedField from "@/components/TranslatedField";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseDateParam(v: string | undefined): [number, number, number] | null {
  if (!v || !DATE_RE.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  return [y, m - 1, d];
}

const STATUS_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  // Matches the only two values backend/app/routers/webhooks.py ever writes
  // to calls.status (line ~109). The previous key here was
  // "reservation_requested", which never matched a real value -- every
  // successfully-captured call silently fell through to the needs_review
  // (amber) styling below instead of its own (jade) one.
  request_captured: { bg: "rgba(55,226,155,.1)", border: "rgba(55,226,155,.24)", color: "var(--jade)" },
  needs_review: { bg: "rgba(255,193,120,.1)", border: "rgba(255,193,120,.24)", color: "#FFC178" },
};

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];
  const intentLabel: Record<string, string> = {
    book_appointment: t.intentBookAppointment,
    callback: t.intentCallback,
    inquiry: t.intentInquiry,
    other: t.intentOther,
  };

  const sp = await searchParams;
  // If both dates are valid and "from" is after "to", the range is stated
  // backwards rather than genuinely invalid -- redirect to the swapped
  // range instead of either silently applying it (URL and the form's
  // displayed values would then disagree) or showing a validation error
  // for something this easy to just correct. Plain string comparison is
  // safe since both are YYYY-MM-DD.
  if (sp.from && sp.to && DATE_RE.test(sp.from) && DATE_RE.test(sp.to) && sp.from > sp.to) {
    redirect(`/dashboard/calls?from=${sp.to}&to=${sp.from}`);
  }

  // Bounds are Madrid calendar days, not UTC ones -- e.g. "to" must include
  // the entirety of that day as observed in Madrid, so the exclusive upper
  // bound is Madrid midnight of the *next* day (day+1 overflows correctly).
  const fromYmd = parseDateParam(sp.from);
  const toYmd = parseDateParam(sp.to);
  const fromUtc = fromYmd ? zonedTimeToUtc(fromYmd[0], fromYmd[1], fromYmd[2]) : null;
  const toUtcExclusive = toYmd ? zonedTimeToUtc(toYmd[0], toYmd[1], toYmd[2] + 1) : null;
  const isFiltered = !!(fromUtc || toUtcExclusive);

  let callsQuery = supabase
    .from("calls").select("*").eq("business_id", business?.id)
    .order("created_at", { ascending: false });
  if (fromUtc) callsQuery = callsQuery.gte("created_at", fromUtc.toISOString());
  if (toUtcExclusive) callsQuery = callsQuery.lt("created_at", toUtcExclusive.toISOString());
  const { data: calls } = await callsQuery;

  return (
    <div className="calls-wrap">
      <div className="dash-in" style={{ marginBottom: 20, flex: "none" }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>{t.callsTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5 }}>{t.callsSub}</p>
      </div>

      <form className="dash-in calls-filter">
        <div>
          <label style={filterLabel}>{t.callsFilterFrom}</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="dash-input" />
        </div>
        <div>
          <label style={filterLabel}>{t.callsFilterTo}</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="dash-input" />
        </div>
        <button type="submit" className="btn-jade" style={filterBtn}>{t.callsFilterApply}</button>
        {isFiltered && (
          <Link href="/dashboard/calls" style={{ fontSize: 13, color: "var(--text-3)", padding: "9px 4px" }}>{t.callsFilterClear}</Link>
        )}
      </form>

      <div className="calls-list">
        {!calls?.length ? (
        <div style={{ textAlign: "center", padding: "56px 20px", border: "1px solid var(--hair)", borderRadius: 18, background: "rgba(255,255,255,.024)" }}>
          <p style={{ fontSize: 15, marginBottom: 6 }}>{isFiltered ? t.callsFilterEmptyTitle : t.callsEmptyTitle}</p>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>{isFiltered ? t.callsFilterEmptySub : t.callsEmptySub}</p>
        </div>
      ) : (
         <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {calls.map((c, i) => {
            const s = STATUS_STYLE[c.status] || STATUS_STYLE.needs_review;
            const statusLabel = c.status === "request_captured" ? t.callStatusCaptured : t.callStatusReview;
            const delayClass = `d${Math.min(i + 1, 6)}`;
            const summaryResolved = resolveTranslatable(c.summary, c.translations, "summary", locale, business?.language ?? "es");
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
                {summaryResolved.text && (
                  <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10, lineHeight: 1.5 }}>
                    {summaryResolved.needsFetch ? (
                      <TranslatedField callId={c.id} locale={locale} field="summary" initialText={summaryResolved.text} />
                    ) : (
                      summaryResolved.text
                    )}
                  </p>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.intent && intentLabel[c.intent] && (
                    <span style={{
                      fontSize: 11, padding: "4px 10px", borderRadius: 999,
                      background: "rgba(255,255,255,.04)", border: "1px solid var(--hair)", color: "var(--text-2)",
                    }}>
                      {intentLabel[c.intent]}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 999,
                    background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                  }}>
                    {statusLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>

      <style>{`
        /* Same fixed-shell pattern as the calendar page: the shell owns the
           viewport height, the title and filter row stay put, and only the
           list scrolls. min-height: 0 is what lets the flex child actually
           shrink below its content height instead of pushing the shell
           taller. Reverts to normal page scroll at the same 700px
           breakpoint the calendar uses -- a pinned inner scroll area is
           awkward on a phone. */
        .calls-wrap { height: calc(100vh - 76px); display: flex; flex-direction: column; padding: 28px 32px; max-width: 760px; }
        .calls-list { flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px; }
        .call-card { padding: 18px; }
        .calls-filter { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; flex: none; }
        @media (max-width: 700px) {
          .calls-wrap { height: auto; padding: 18px 16px; }
          .calls-list { overflow-y: visible; min-height: auto; padding-right: 0; }
        }
        @media (max-width: 480px) {
          .call-card { padding: 14px; }
          .call-card-head { gap: 8px; }
          .calls-filter { flex-direction: column; align-items: stretch; }
        }
      `}</style>
    </div>
  );
}

const filterLabel: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 500, color: "var(--text-3)", marginBottom: 6 };
const filterBtn: React.CSSProperties = {
  padding: "11px 20px", borderRadius: 11, border: "none",
  fontSize: 13.5, fontWeight: 600, color: "#04140D", cursor: "pointer",
  background: "linear-gradient(180deg,#5CEBAF,var(--jade-2))",
};
