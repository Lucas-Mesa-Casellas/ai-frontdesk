import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconPhone } from "@/components/icons";
import { BUSINESS_TZ, zonedTimeToUtc } from "@/lib/tz";
import { resolveTranslatable } from "@/lib/translate-helpers";
import TranslatedField from "@/components/TranslatedField";
import DateFilterInput from "@/components/DateFilterInput";

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
        {/* Keyed by the actual filter value: DateFilterInput's typed text is
            local useState seeded from defaultValue only on mount, so a soft
            navigation that changes searchParams without unmounting the
            component (e.g. the Clear link below) would otherwise leave
            stale text in the field after the filter itself has cleared.
            A key that changes forces React to remount instead of reusing
            the instance, which resets that state to match. */}
        <DateFilterInput key={`from-${sp.from ?? ""}`} name="from" defaultValue={sp.from ?? ""} label={t.callsFilterFrom} labelStyle={filterLabel} placeholder={t.callsFilterDatePlaceholder} locale={locale} />
        <DateFilterInput key={`to-${sp.to ?? ""}`} name="to" defaultValue={sp.to ?? ""} label={t.callsFilterTo} labelStyle={filterLabel} placeholder={t.callsFilterDatePlaceholder} locale={locale} />
        <button type="submit" className="btn-jade" style={filterBtn}>{t.callsFilterApply}</button>
        {isFiltered && (
          <Link href="/dashboard/calls" className="link-quiet" style={{ fontSize: 13, padding: "9px 4px" }}>{t.callsFilterClear}</Link>
        )}
      </form>

      <div className="calls-list">
        {!calls?.length ? (
        <div style={{ textAlign: "center", padding: "56px 20px", border: "1px solid var(--hair)", borderRadius: 18, background: "rgba(255,255,255,.024)" }}>
          <p style={{ fontSize: 15, marginBottom: 6 }}>{isFiltered ? t.callsFilterEmptyTitle : t.callsEmptyTitle}</p>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>{isFiltered ? t.callsFilterEmptySub : t.callsEmptySub}</p>
        </div>
      ) : (
        <div className="dash-card dash-in calls-table">
          <div className="call-row call-thead" aria-hidden="true">
            <span>{t.colCaller}</span>
            <span>{t.colNumber}</span>
            <span>{t.colSummary}</span>
            <span>{t.colOutcome}</span>
            <span>{t.colWhen}</span>
          </div>
          {calls.map((c) => {
            const s = STATUS_STYLE[c.status] || STATUS_STYLE.needs_review;
            const statusLabel = c.status === "request_captured" ? t.callStatusCaptured : t.callStatusReview;
            const summaryResolved = resolveTranslatable(c.summary, c.translations, "summary", locale, business?.language ?? "es");
            const when = new Date(c.created_at);
            return (
              <Link key={c.id} href={`/dashboard/calls/${c.id}`} className="call-row call-tr">
                <span className="cr-caller">
                  <span className="cr-ic"><IconPhone width={14} height={14} /></span>
                  <b>{c.caller_name || t.unknown}</b>
                </span>
                <span className="cr-num">{c.caller_phone || t.noPhone}</span>
                <span className="cr-sum">
                  {summaryResolved.text && (
                    summaryResolved.needsFetch ? (
                      <TranslatedField callId={c.id} locale={locale} field="summary" initialText={summaryResolved.text} />
                    ) : (
                      summaryResolved.text
                    )
                  )}
                </span>
                <span className="cr-out">
                  <span className="cr-pill" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
                    {statusLabel}
                  </span>
                  {c.intent && intentLabel[c.intent] && (
                    <span className="cr-pill cr-pill-n">{intentLabel[c.intent]}</span>
                  )}
                </span>
                <span className="cr-when">
                  <b>{when.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: BUSINESS_TZ })}</b>
                  <span>{when.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}</span>
                </span>
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
        .calls-wrap { height: calc(100vh - 76px); display: flex; flex-direction: column; padding: 28px 32px; max-width: 1180px; }
        .calls-list { flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px; }
        .calls-filter { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; flex: none; }

        /* the table: one card, a header row, then a row per call */
        .calls-table { padding: 0; overflow: hidden; }
        .calls-table:hover { transform: none; box-shadow: none; }
        .call-row {
          display: grid; align-items: center; column-gap: 18px;
          grid-template-columns: minmax(150px, 1.1fr) minmax(120px, .8fr) minmax(180px, 2fr) minmax(150px, 1.05fr) 96px;
          padding: 13px 20px; text-decoration: none; color: inherit;
        }
        .call-thead {
          position: sticky; top: 0; z-index: 1; padding-top: 14px; padding-bottom: 12px;
          font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3);
          background: rgba(10,14,13,.92); border-bottom: 1px solid var(--hair);
        }
        .call-tr { border-bottom: 1px solid var(--hair); transition: background .2s var(--e-out); }
        .call-tr:last-child { border-bottom: 0; }
        .call-tr:hover { background: rgba(55,226,155,.045); }
        .cr-caller { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .cr-caller b { font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cr-ic {
          width: 32px; height: 32px; border-radius: 50%; flex: none; display: grid; place-items: center;
          background: rgba(55,226,155,.1); border: 1px solid rgba(55,226,155,.2); color: var(--jade);
        }
        .cr-num { font-size: 12.5px; color: var(--text-2); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cr-sum { font-size: 12.5px; line-height: 1.5; color: var(--text-3); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cr-out { display: flex; flex-wrap: wrap; gap: 6px; }
        .cr-pill { font-size: 11px; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
        .cr-pill-n { background: rgba(255,255,255,.04); border: 1px solid var(--hair); color: var(--text-2); }
        .cr-when { display: flex; flex-direction: column; gap: 1px; text-align: right; }
        .cr-when b { font-size: 12.5px; font-weight: 500; }
        .cr-when span { font-size: 12px; color: var(--text-3); }

        /* not enough width for five columns: each call becomes a small card
           (caller + time on top, then the summary, then the tags) */
        @media (max-width: 1000px) {
          .call-thead { display: none; }
          .call-row {
            grid-template-columns: minmax(0, 1fr) auto; row-gap: 8px;
            grid-template-areas: "caller when" "num num" "sum sum" "out out";
            padding: 16px;
          }
          .cr-caller { grid-area: caller; }
          .cr-when { grid-area: when; }
          .cr-num { grid-area: num; }
          .cr-sum { grid-area: sum; -webkit-line-clamp: 3; }
          .cr-out { grid-area: out; }
        }
        @media (max-width: 700px) {
          .calls-wrap { height: auto; padding: 18px 16px; }
          .calls-list { overflow-y: visible; min-height: auto; padding-right: 0; }
        }
        @media (max-width: 480px) {
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
