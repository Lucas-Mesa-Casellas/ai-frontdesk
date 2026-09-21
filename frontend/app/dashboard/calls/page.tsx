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
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseDateParam(v: string | undefined): [number, number, number] | null {
  if (!v || !DATE_RE.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  return [y, m - 1, d];
}

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
    <div className="ui-page">
      <PageHeader
        eyebrow={<Badge tone="jade" dot>{calls?.length ?? 0} {t.navCalls.toLowerCase()}</Badge>}
        title={t.navCalls}
        lede={t.callsSub}
      />

      {/* A plain GET form: the date inputs submit ?from=&to= to this same page. */}
      <Card as="form" className="dash-in d1 calls-toolbar">
        {/* Keyed by the actual filter value: DateFilterInput's typed text is
            local useState seeded from defaultValue only on mount, so a soft
            navigation that changes searchParams without unmounting the
            component (e.g. the Clear link below) would otherwise leave
            stale text in the field after the filter itself has cleared.
            A key that changes forces React to remount instead of reusing
            the instance, which resets that state to match. */}
        <DateFilterInput key={`from-${sp.from ?? ""}`} name="from" defaultValue={sp.from ?? ""} label={t.callsFilterFrom} labelStyle={filterLabel} placeholder={t.callsFilterDatePlaceholder} locale={locale} />
        <DateFilterInput key={`to-${sp.to ?? ""}`} name="to" defaultValue={sp.to ?? ""} label={t.callsFilterTo} labelStyle={filterLabel} placeholder={t.callsFilterDatePlaceholder} locale={locale} />
        <button type="submit" className="ui-btn ui-btn--primary">{t.callsFilterApply}</button>
        {isFiltered && (
          <Link href="/dashboard/calls" className="ui-btn ui-btn--secondary">{t.callsFilterClear}</Link>
        )}
      </Card>

      {!calls?.length ? (
        <Card as="section" className="dash-in d2 calls-empty">
          <span className="calls-empty-ic"><IconPhone width={22} height={22} /></span>
          <p>{isFiltered ? t.callsFilterEmptyTitle : t.callsEmptyTitle}</p>
          <p>{isFiltered ? t.callsFilterEmptySub : t.callsEmptySub}</p>
        </Card>
      ) : (
        <Card as="section" className="dash-in d2 calls-table">
          <div className="call-row call-thead" aria-hidden="true">
            <span>{t.colCaller}</span>
            <span>{t.colNumber}</span>
            <span>{t.colSummary}</span>
            <span>{t.colOutcome}</span>
            <span>{t.colWhen}</span>
            <span />
          </div>
          {calls.map((c) => {
            // calls.status only ever holds two values (see backend
            // routers/webhooks.py): request_captured -> jade, and anything
            // else is treated as needs_review -> amber.
            const statusLabel = c.status === "request_captured" ? t.callStatusCaptured : t.callStatusReview;
            const statusTone = c.status === "request_captured" ? "jade" : "warning";
            const summaryResolved = resolveTranslatable(c.summary, c.translations, "summary", locale, business?.language ?? "es");
            const when = new Date(c.created_at);
            // Older calls are anonymised in place (name/number/summary nulled),
            // so every cell has a quiet fallback rather than an empty hole.
            const initial = (c.caller_name || "").trim().charAt(0).toUpperCase();
            return (
              <Link key={c.id} href={`/dashboard/calls/${c.id}`} className="call-row call-tr">
                <span className="cr-caller">
                  <span className="cr-av" aria-hidden="true">{initial || <IconPhone width={14} height={14} />}</span>
                  <b>{c.caller_name || t.unknown}</b>
                </span>
                <span className="cr-num">{c.caller_phone || t.noPhone}</span>
                <span className="cr-sum">
                  {summaryResolved.text ? (
                    summaryResolved.needsFetch ? (
                      <TranslatedField callId={c.id} locale={locale} field="summary" initialText={summaryResolved.text} />
                    ) : (
                      summaryResolved.text
                    )
                  ) : (
                    <span className="cr-none">—</span>
                  )}
                </span>
                <span className="cr-out">
                  <Badge tone={statusTone}>{statusLabel}</Badge>
                  {c.intent && intentLabel[c.intent] && <Badge>{intentLabel[c.intent]}</Badge>}
                </span>
                <span className="cr-when">
                  <b>{when.toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: BUSINESS_TZ })}</b>
                  <span>{when.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ })}</span>
                </span>
                <span className="cr-chev" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9.5 6 6 6-6 6" /></svg>
                </span>
              </Link>
            );
          })}
        </Card>
      )}

      <style>{`
        /* filter toolbar: the two date fields, then the actions, on one calm row */
        .calls-toolbar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 12px; padding: 16px 18px; margin-bottom: 16px; }
        .calls-toolbar:hover { transform: none; }

        /* the table: one surface, hairline rows, no floating cards */
        .calls-table { padding: 0; overflow: hidden; }
        .calls-table:hover { transform: none; box-shadow: var(--shadow-card); }
        .call-row {
          display: grid; align-items: center; column-gap: 20px;
          grid-template-columns: minmax(160px, 1.15fr) minmax(130px, .8fr) minmax(200px, 2fr) minmax(150px, 1.05fr) 96px 18px;
          padding: 15px 24px; text-decoration: none; color: inherit;
        }
        .call-thead {
          padding-top: 15px; padding-bottom: 13px;
          font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3);
          background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border);
        }
        .call-tr { border-bottom: 1px solid var(--border); transition: background .2s var(--e-out); }
        .call-tr:last-child { border-bottom: 0; }
        .call-tr:hover { background: rgba(55,226,155,.045); }
        .call-tr:hover .cr-chev { color: var(--jade); transform: translateX(2px); }
        .cr-caller { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .cr-caller b { font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cr-av {
          width: 34px; height: 34px; border-radius: 50%; flex: none; display: grid; place-items: center;
          font-size: 12.5px; font-weight: 600; color: var(--jade);
          background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.22);
        }
        .cr-num { font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cr-sum { font-size: 13px; line-height: 1.5; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cr-none { color: var(--text-3); }
        .cr-out { display: flex; flex-wrap: wrap; gap: 6px; }
        .cr-when { display: flex; flex-direction: column; gap: 2px; text-align: right; }
        .cr-when b { font-size: 12.5px; font-weight: 500; }
        .cr-when span { font-size: 12px; color: var(--text-3); }
        .cr-chev { color: var(--text-3); display: grid; place-items: center; transition: color .2s var(--e-out), transform .2s var(--e-out); }

        .calls-empty { padding: 64px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .calls-empty:hover { transform: none; }
        .calls-empty-ic {
          width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 10px;
          color: var(--jade); background: rgba(55,226,155,.08); border: 1px solid rgba(55,226,155,.2);
        }
        .calls-empty p:first-of-type { font-size: 15px; color: var(--text); }
        .calls-empty p:last-of-type { font-size: 13px; color: var(--text-3); max-width: 40ch; }

        /* not enough width for six columns: each call becomes a compact card
           (caller + time on top, then number, summary and tags) */
        @media (max-width: 1000px) {
          .call-thead { display: none; }
          .call-row {
            grid-template-columns: minmax(0, 1fr) auto; row-gap: 8px;
            grid-template-areas: "caller when" "num num" "sum sum" "out out";
            padding: 18px;
          }
          .cr-caller { grid-area: caller; }
          .cr-when { grid-area: when; }
          .cr-num { grid-area: num; }
          .cr-sum { grid-area: sum; -webkit-line-clamp: 3; }
          .cr-out { grid-area: out; }
          .cr-chev { display: none; }
        }
        @media (max-width: 560px) {
          .calls-toolbar { flex-direction: column; align-items: stretch; }
          .calls-toolbar .ui-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const filterLabel: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--text-3)", marginBottom: 8 };
