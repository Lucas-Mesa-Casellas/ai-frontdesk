import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { BUSINESS_TZ, madridHour, zonedTimeToUtc } from "@/lib/tz";
import CountUp from "@/components/CountUp";
import AutoRefresh from "@/components/AutoRefresh";
import { dashBase } from "@/lib/demo/mode";
import TranslatedField from "@/components/TranslatedField";
import Card from "@/components/ui/Card";
import { resolveTranslatable } from "@/lib/translate-helpers";
import { IconPhone, IconCalendar } from "@/components/icons";
import Link from "next/link";

// "5 minutes ago" / "hace 2 horas" / "il y a 3 jours", in the dashboard's own
// language. The page re-runs every minute (AutoRefresh), so it stays current.
function ago(date: Date, locale: string) {
  const secs = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (secs < 3600) return rtf.format(-Math.max(1, Math.round(secs / 60)), "minute");
  if (secs < 86400) return rtf.format(-Math.round(secs / 3600), "hour");
  return rtf.format(-Math.round(secs / 86400), "day");
}

export default async function OverviewPage() {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const businessId = business?.id;
  const base = await dashBase();

  const [
    { count: totalCalls },
    { count: totalBookings },
    { data: bookedCallIds },
    { data: allCallTimes },
    { data: latestCalls },
  ] = await Promise.all([
    supabase.from("calls").select("*", { count: "exact", head: true }).eq("business_id", businessId),
    // Every booking request ever captured, which is what the "Booking
    // requests" label says -- not a status='pending' subset, which read as
    // an inbox count and dropped every time one was confirmed or cancelled.
    supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("business_id", businessId),
    // Booking rate is "% of calls that led to at least one booking," not a
    // raw booking count -- a single call can produce more than one booking,
    // and bookings.call_id is ON DELETE SET NULL (bookings intentionally
    // outlive a purged/deleted call), so counting rows directly can exceed
    // totalCalls and push this over 100%. Any booking ever created still
    // counts here regardless of what later happened to it -- this must NOT
    // filter by status, or confirming/cancelling a booking would make the
    // rate go down for having done so.
    supabase.from("bookings").select("call_id")
      .eq("business_id", businessId).not("call_id", "is", null),
    supabase.from("calls").select("created_at").eq("business_id", businessId),
    // The five most recent, for the "Latest calls" card beside the chart.
    supabase.from("calls").select("id, caller_name, caller_phone, created_at, summary, translations")
      .eq("business_id", businessId).order("created_at", { ascending: false }).limit(5),
  ]);

  const distinctBookedCalls = new Set((bookedCallIds || []).map((b) => b.call_id)).size;
  const conv = totalCalls ? Math.min(100, Math.round((distinctBookedCalls / totalCalls) * 100)) : 0;

  const hourCounts = Array(24).fill(0);
  (allCallTimes || []).forEach((c) => { hourCounts[madridHour(new Date(c.created_at))]++; });
  const maxHourCount = Math.max(1, ...hourCounts);
  // The y axis runs 0..niceMax in four equal steps (4, 8, 12... never a
  // ragged top like 7), and bars are scaled to it so they sit on the gridlines.
  const niceMax = Math.max(4, Math.ceil(maxHourCount / 4) * 4);
  const yTicks = [0, 1, 2, 3, 4].map((i) => (niceMax / 4) * (4 - i));
  const hourLabel = (h: number) =>
    zonedTimeToUtc(2024, 0, 1, h).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ });
  const axisHours = [0, 3, 6, 9, 12, 15, 18, 21];

  const hour = madridHour(new Date());
  const greeting = hour < 12 ? t.greetMorning : hour < 20 ? t.greetAfternoon : t.greetEvening;

  return (
    <div className="ov-wrap">
      <header className="ov-head dash-in">
        <h1 className="ov-title">{t.ovTitle}</h1>
        <p className="ov-lede">
          {greeting}{business?.name ? `, ${business.name}` : ""}. {t.ovWelcome}
        </p>
      </header>

      <div className="ov-stats">
        <Card className="dash-in d1 ov-stat-card">
          <span className="ov-stat-ic"><IconPhone width={20} height={20} /></span>
          <div className="ov-stat-tx">
            <p className="ov-stat-label">{t.statCalls}</p>
            <p className="ov-stat-num"><CountUp value={totalCalls ?? 0} locale={locale} /></p>
          </div>
        </Card>

        <Card accent className="dash-in d2 ov-stat-card">
          <span className="ov-stat-ic"><IconCalendar width={20} height={20} /></span>
          <div className="ov-stat-tx">
            <p className="ov-stat-label">{t.statBookings}</p>
            <p className="ov-stat-num"><CountUp value={totalBookings ?? 0} locale={locale} /></p>
          </div>
        </Card>

        <Card className="dash-in d3 ov-stat-card">
          <span className="ov-stat-ic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 20V12M12 20V5M18 20v-6" />
            </svg>
          </span>
          <div className="ov-stat-tx">
            <p className="ov-stat-label">{t.statConv}</p>
            <p className="ov-stat-num"><CountUp value={conv} locale={locale} suffix="%" /></p>
          </div>
        </Card>
      </div>

      <div className="ov-row">
        <Card as="section" className="dash-in d4 ov-panel ov-chartcard">
          <div className="ov-panel-head">
            <div>
              <h2 className="ov-h2">{t.hourChartTitle}</h2>
              <p className="ov-sub">{t.hourChartSub}</p>
            </div>
          </div>
          {!totalCalls ? (
            <EmptyState
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20V11M10 20V6M15 20v-7M20 20V9" /></svg>}
              title={t.noCalls}
            />
          ) : (
            <>
              <div className="ov-chart">
                <div className="ov-yaxis" aria-hidden="true">
                  {yTicks.map((v, i) => <span key={v} style={{ top: `${i * 25}%` }}>{v}</span>)}
                </div>
                <div className="ov-plot">
                  <div className="ov-gridlines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                  <div className="ov-hourbars">
                    {/* Each hour is a full-height column (the bar sits in its
                        bottom), so an empty hour is still hoverable -- the bar
                        alone is 2px tall when there are no calls. */}
                    {hourCounts.map((count, h) => {
                      const tip = t.chartTooltip(hourLabel(h), count);
                      return (
                        <div
                          key={h}
                          className={`ov-hourcol${h < 3 ? " edge-l" : h > 20 ? " edge-r" : ""}`}
                          data-tip={tip}
                          role="img"
                          aria-label={tip}
                        >
                          <div
                            className={`ov-hourbar${count > 0 && count === maxHourCount ? " is-peak" : ""}`}
                            style={{ height: count > 0 ? `${Math.max((count / niceMax) * 100, 4)}%` : 2 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="ov-hourlabels">
                {/* One span per hour, same flex/gap sizing as .ov-hourbars,
                    so each tick sits directly under its own bar. Non-tick
                    hours render an empty span purely to hold the same width. */}
                {hourCounts.map((_, h) => (
                  <span key={h} className={h % 6 !== 0 ? "ov-hourlabel-thin" : undefined}>
                    {axisHours.includes(h) ? hourLabel(h) : ""}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card as="section" className="dash-in d5 ov-panel ov-latest">
          <div className="ov-panel-head">
            <h2 className="ov-h2">{t.ovLatest}</h2>
            {!!latestCalls?.length && (
              <Link href={`${base}/calls`} className="ov-viewall">{t.ovViewAll} →</Link>
            )}
          </div>
          {!latestCalls?.length ? (
            <EmptyState
              icon={<IconPhone width={22} height={22} />}
              title={t.callsEmptyTitle}
              sub={t.callsEmptySub}
            />
          ) : (
            <div className="ov-latest-list">
              {latestCalls.map((c) => {
                const summary = resolveTranslatable(c.summary, c.translations, "summary", locale, business?.language ?? "es");
                const when = new Date(c.created_at);
                const initial = (c.caller_name || "").trim().charAt(0).toUpperCase();
                return (
                  <Link key={c.id} href={`${base}/calls/${c.id}`} className="ov-latest-row">
                    <span className="ov-latest-av" aria-hidden="true">
                      {initial || <IconPhone width={14} height={14} />}
                    </span>
                    <span className="ov-latest-main">
                      <b>{c.caller_name || t.unknown}</b>
                      {summary.text && (
                        <span className="ov-latest-sum">
                          {summary.needsFetch
                            ? <TranslatedField callId={c.id} locale={locale} field="summary" initialText={summary.text} />
                            : summary.text}
                        </span>
                      )}
                    </span>
                    <time
                      className="ov-latest-when" dateTime={c.created_at}
                      title={when.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: BUSINESS_TZ })}
                    >
                      {ago(when, locale)}
                    </time>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Keeps the "live" figures at most a minute old while the tab is open. */}
      <AutoRefresh seconds={60} />

      <style>{`
        /* Uses the space it's given: centred, up to 1320px, generous gutters. */
        /* Fills the screen under the 68px top bar without scrolling: the KPI row
           keeps its size and the chart + latest-calls row takes the rest. */
        .ov-wrap {
          position: relative; padding: 32px 40px 32px; max-width: 1320px; margin-inline: auto; isolation: isolate;
          min-height: calc(100svh - 68px); display: flex; flex-direction: column;
        }

        /* header: live badge -> title -> one supporting line */
        .ov-head { margin-bottom: 24px; }
        .ov-title { font-size: 30px; font-weight: 600; letter-spacing: -.03em; line-height: 1.1; margin: 0 0 8px; }
        .ov-lede { font-size: 14px; line-height: 1.55; color: var(--text-3); max-width: 90ch; }

        /* KPI row: icon tile, small label, large value */
        .ov-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
        .ov-stat-card { position: relative; padding: 20px 22px; display: flex; align-items: center; gap: 16px; }
        .ov-stat-ic {
          width: 48px; height: 48px; border-radius: 14px; flex: none; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.22);
        }
        .ov-stat-tx { min-width: 0; }
        .ov-stat-label { font-size: 12.5px; font-weight: 500; color: var(--text-3); margin-bottom: 5px; }
        .ov-stat-num { font-size: 32px; font-weight: 600; letter-spacing: -.035em; line-height: 1; font-variant-numeric: tabular-nums; }
        /* The one accent card in the row gets a brighter tile as well as the edge. */
        .dash-card-highlight .ov-stat-ic { background: rgba(55,226,155,.14); border-color: rgba(55,226,155,.34); box-shadow: 0 12px 26px -14px rgba(18,185,129,.75); }

        /* Adapted from the landing page's .aura treatment (globals.css):
           a blurred jade field sitting behind the subject, bleeding out
           past its edges. There the console covers the middle, so only the
           rim reads -- these cards are semi-transparent, so a filled
           gradient shows through as a smudge instead. closest-side with a
           transparent core reproduces what the aura actually looks like:
           glow at the edges only. Toned down three times now -- .42/.34
           read as washed-out, .18/.24 and then .14/.20 were both still a
           bit bright per Lucas. Picked by eye against several candidates
           each round, not the first number tried. */
        .ov-stat-card::after, .ov-panel::after {
          content: ""; position: absolute; inset: -14px; border-radius: 30px;
          background: radial-gradient(closest-side, transparent 55%, rgba(55,226,155,.16) 100%);
          filter: blur(10px); opacity: .1; z-index: -1; pointer-events: none;
        }

        /* chart + latest calls */
        .ov-row { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
        .ov-panel { position: relative; padding: 24px; display: flex; flex-direction: column; }
        .ov-panel:hover { transform: none; } /* big surfaces stay put; only the KPI cards lift */
        .ov-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
        .ov-h2 { font-size: 15px; font-weight: 600; letter-spacing: -.015em; color: var(--text); }
        .ov-sub { font-size: 12.5px; color: var(--text-3); margin-top: 3px; }
        .ov-viewall { font-size: 12.5px; color: var(--text-3); white-space: nowrap; transition: color .2s var(--e-out); }
        .ov-viewall:hover { color: var(--jade); }

        /* chart: y axis + gridlines, bars scaled to the axis */
        .ov-chart { display: flex; gap: 12px; flex: 1; min-height: 150px; }
        .ov-yaxis { position: relative; width: 22px; flex: none; }
        .ov-yaxis span { position: absolute; right: 0; transform: translateY(-50%); font-size: 10.5px; line-height: 1; color: var(--text-3); font-variant-numeric: tabular-nums; }
        .ov-plot { position: relative; flex: 1; min-width: 0; }
        .ov-gridlines { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
        .ov-gridlines i { display: block; height: 1px; background: rgba(255,255,255,.055); }
        .ov-gridlines i:last-child { background: rgba(255,255,255,.11); }
        .ov-hourbars { position: relative; display: flex; align-items: flex-end; gap: 3px; height: 100%; }
        .ov-hourcol { position: relative; flex: 1; min-width: 3px; height: 100%; display: flex; align-items: flex-end; }
        .ov-hourbar {
          width: 100%; border-radius: 3px 3px 0 0;
          background: linear-gradient(180deg, rgba(55,226,155,.78), rgba(5,150,105,.5));
          transition: opacity .18s var(--e-out), filter .18s var(--e-out);
        }
        /* the busiest hour(s): brighter, with a soft glow */
        .ov-hourbar.is-peak { background: linear-gradient(180deg, var(--jade-bright), var(--jade)); box-shadow: 0 0 18px -4px rgba(55,226,155,.65); }
        /* Hover one hour: the rest dim, and a tooltip with the exact count
           appears (the first / last few anchor to the edge so it can't run off the card). */
        .ov-hourbars:hover .ov-hourbar { opacity: .32; }
        .ov-hourbars .ov-hourcol:hover .ov-hourbar { opacity: 1; filter: brightness(1.15); }
        .ov-hourcol::after {
          content: attr(data-tip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translate(-50%, 4px);
          white-space: nowrap; padding: 6px 10px; border-radius: 8px; font-size: 11.5px; line-height: 1.2; color: var(--text);
          background: rgba(13,16,21,.98); border: 1px solid var(--border-strong); box-shadow: 0 14px 30px -12px rgba(0,0,0,.9);
          opacity: 0; pointer-events: none; z-index: 5; transition: opacity .16s var(--e-out), transform .16s var(--e-out);
        }
        .ov-hourcol.edge-l::after { left: 0; transform: translate(0, 4px); }
        .ov-hourcol.edge-r::after { left: auto; right: 0; transform: translate(0, 4px); }
        .ov-hourcol:hover::after { opacity: 1; transform: translate(-50%, 0); }
        .ov-hourcol.edge-l:hover::after, .ov-hourcol.edge-r:hover::after { transform: translate(0, 0); }
        .ov-hourlabels { display: flex; gap: 3px; margin: 10px 0 0 34px; }
        .ov-hourlabels span { flex: 1; min-width: 3px; display: flex; justify-content: center; white-space: nowrap; font-size: 10px; color: var(--text-3); }

        /* latest calls: one surface, rows divided by hairlines (not a stack of cards) */
        .ov-latest-list { display: flex; flex-direction: column; margin: 0 -12px; }
        .ov-latest-row {
          display: flex; align-items: center; gap: 13px; padding: 12px; border-radius: 12px;
          color: inherit; text-decoration: none; transition: background .2s var(--e-out);
        }
        .ov-latest-row + .ov-latest-row { border-top: 1px solid var(--border); border-top-left-radius: 0; border-top-right-radius: 0; }
        .ov-latest-row:hover { background: rgba(55,226,155,.05); }
        .ov-latest-av {
          width: 36px; height: 36px; border-radius: 50%; flex: none; display: grid; place-items: center;
          font-size: 13px; font-weight: 600; color: var(--jade);
          background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.22);
        }
        .ov-latest-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .ov-latest-main b { font-size: 13.5px; font-weight: 500; }
        .ov-latest-sum { font-size: 12.5px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ov-latest-when { flex: none; font-size: 12px; color: var(--text-3); white-space: nowrap; }

        /* empty states: an icon tile, the existing sentence, nothing invented */
        .ov-empty { flex: 1; min-height: 190px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px; padding: 12px; }
        .ov-empty-ic {
          width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; margin-bottom: 8px;
          color: var(--jade); background: rgba(55,226,155,.08); border: 1px solid rgba(55,226,155,.2);
        }
        .ov-empty p { font-size: 14px; color: var(--text-2); }
        .ov-empty p + p { font-size: 12.5px; color: var(--text-3); max-width: 34ch; }

        @media (min-width: 1500px) {
          .ov-row { grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); }
        }
        /* laptop-height screens: a little tighter so it still fits */
        @media (min-width: 761px) and (max-height: 800px) {
          .ov-wrap { padding-top: 24px; padding-bottom: 24px; }
          .ov-head { margin-bottom: 18px; }
          .ov-stat-card { padding: 16px 20px; }
          .ov-panel { padding: 20px 22px; }
          .ov-panel-head { margin-bottom: 12px; }
          .ov-latest-row { padding: 9px 12px; }
        }
        @media (max-width: 1100px) {
          .ov-wrap { min-height: 0; }
          .ov-row { grid-template-columns: minmax(0, 1fr); }
        }
        /* Narrow: the KPIs stack one per row (icon + text side by side) rather
           than three cramped columns, and the gutters tighten. */
        @media (max-width: 760px) {
          .ov-wrap { padding: 22px 18px 32px; }
          .ov-stats { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .ov-stat-card { padding: 18px; }
          .ov-title { font-size: 26px; }
          .ov-panel { padding: 20px; }
        }
        @media (max-width: 480px) {
          .ov-yaxis { width: 16px; }
          .ov-hourlabels { margin-left: 28px; }
          .ov-hourbars, .ov-hourlabels { gap: 2px; }
          /* Only every sixth hour is labelled here (00, 06, 12, 18): the
             other spans stay (hidden) so each label still sits under its own
             bar. Scoped under .ov-hourlabels -- the bare class used to lose
             to ".ov-hourlabels span { display: flex }" and never hid anything,
             so eight labels overlapped on phones. */
          .ov-hourlabels .ov-hourlabel-thin { visibility: hidden; }
          .ov-stat-card::after { inset: -8px; border-radius: 20px; filter: blur(7px); opacity: .07; }
        }
      `}</style>
    </div>
  );
}

// A quiet empty state: an icon tile plus the sentence(s) the app already has.
function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="ov-empty">
      <span className="ov-empty-ic">{icon}</span>
      <p>{title}</p>
      {sub && <p>{sub}</p>}
    </div>
  );
}
