import { getAuthedBusiness } from "@/lib/dashboard-data";
import { getLocale } from "@/lib/locale";
import { DASH_T } from "@/lib/dash-i18n";
import { BUSINESS_TZ, madridHour, zonedTimeToUtc } from "@/lib/tz";
import AnimateOnRouteEntry from "@/components/AnimateOnRouteEntry";
 
export default async function OverviewPage() {
  const { supabase, business } = await getAuthedBusiness();
  const locale = await getLocale();
  const t = DASH_T[locale];

  const businessId = business?.id;

  const [
    { count: totalCalls },
    { count: totalBookings },
    { data: bookedCallIds },
    { data: allCallTimes },
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
  ]);

  const distinctBookedCalls = new Set((bookedCallIds || []).map((b) => b.call_id)).size;
  const conv = totalCalls ? Math.min(100, Math.round((distinctBookedCalls / totalCalls) * 100)) : 0;

  const hourCounts = Array(24).fill(0);
  (allCallTimes || []).forEach((c) => { hourCounts[madridHour(new Date(c.created_at))]++; });
  const maxHourCount = Math.max(1, ...hourCounts);
  const hourLabel = (h: number) =>
    zonedTimeToUtc(2024, 0, 1, h).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ });
  const axisHours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div className="ov-wrap">
      <div className="dash-in" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 6 }}>{t.ovTitle}</h1>
        <p style={{ color: "var(--text-3)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="live-dot" />
          {t.ovSub}
        </p>
      </div>

      <div className="ov-stats">
        <div className="dash-card dash-in d1 ov-stat-card">
          <p className="ov-stat-num" style={{ fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1 }}>{totalCalls ?? 0}</p>
          <p className="ov-stat-label" style={{ color: "var(--text-3)" }}>{t.statCalls}</p>
        </div>

        <div className="dash-card dash-card-highlight dash-in d2 ov-stat-card">
          <p className="ov-stat-num" style={{ fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1 }}>{totalBookings ?? 0}</p>
          <p className="ov-stat-label" style={{ color: "var(--text-3)" }}>{t.statBookings}</p>
        </div>

        <div className="dash-card dash-in d3 ov-stat-card">
          <p className="ov-stat-num" style={{ fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 4, lineHeight: 1 }}>{conv}%</p>
          <p className="ov-stat-label" style={{ color: "var(--text-3)" }}>{t.statConv}</p>
        </div>
      </div>

      <div className="dash-card dash-in d4 ov-panel">
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>{t.hourChartTitle}</h2>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{t.hourChartSub}</p>
        </div>
        {!totalCalls ? (
          <Empty text={t.noCalls} />
        ) : (
          <>
            <div className="ov-hourbars">
              {hourCounts.map((count, h) => (
                <div
                  key={h}
                  className="ov-hourbar"
                  title={t.chartTooltip(hourLabel(h), count)}
                  style={{ height: count > 0 ? `${Math.max((count / maxHourCount) * 100, 8)}%` : 2 }}
                />
              ))}
            </div>
            <div className="ov-hourlabels">
              {/* One span per hour, same flex/gap sizing as .ov-hourbars,
                  so each tick sits directly under its own bar -- the
                  previous 8-item row spread evenly via space-between,
                  which pins the LAST tick (21) to the container's right
                  edge even though bars 22 and 23 still follow it, dragging
                  every label progressively further right of its real bar
                  the closer it gets to the end. Non-tick hours render an
                  empty span purely to hold the same width. */}
              {hourCounts.map((_, h) => (
                <span key={h} className={h % 6 !== 0 ? "ov-hourlabel-thin" : undefined}>
                  {axisHours.includes(h) ? hourLabel(h) : ""}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <AnimateOnRouteEntry
        className="ov-wave" activeClassName="ov-wave-animate" doneClassName="ov-wave-done"
        once storageKey="ov-wave-played"
      >
        <div className="ov-wave-line" />
        <div className="ov-wave-badge" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="18.6" cy="5.4" r="2.85" fill="#04140D" />
          </svg>
        </div>
      </AnimateOnRouteEntry>

      <style>{`
        .ov-wrap { position: relative; padding: 32px 36px; max-width: 1080px; isolation: isolate; }
        .ov-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 32px; }
        .ov-stat-card { position: relative; padding: 20px; }
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
        .ov-stat-num { font-size: 28px; }
        .ov-stat-label { font-size: 12px; }
        .ov-panel { position: relative; padding: 24px; }
        .ov-hourbars { display: flex; align-items: flex-end; gap: 2px; height: 80px; border-bottom: 1px solid var(--hair); }
        .ov-hourbar { flex: 1; min-width: 3px; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, var(--jade), var(--jade-deep)); }
        .ov-hourlabels { display: flex; gap: 2px; margin-top: 6px; }
        .ov-hourlabels span { flex: 1; min-width: 3px; font-size: 9.5px; color: var(--text-3); text-align: center; }
        /* A neon line lighting up left-to-right, not a blurred bar sliding
           across -- scaleX grows a SOLID line rather than translating a
           faded gradient segment, so everything behind the growing edge
           stays fully lit instead of fading back to transparent, and it
           ends as a solid, fully bright line rather than a faded remnant.
           Sits between the hour chart and the nav buttons now, in normal
           flow (not pinned to .ov-wrap's bottom edge) -- height leaves
           room for the badge, which is taller than the line itself and
           needs to stay vertically centered on it throughout the draw. */
        .ov-wave {
          position: relative; height: 22px; margin: 28px 0 0;
        }
        .ov-wave-line {
          position: absolute; left: 0; right: 26px; top: 50%; height: 2px;
          background: var(--jade);
          opacity: .55;
          transform: translateY(-50%) scaleX(0); transform-origin: left;
          box-shadow: 0 0 6px 1px rgba(55,226,155,.4), 0 0 14px 4px rgba(55,226,155,.2);
        }
        /* The badge (the company mark, same as the sidebar's logo badge)
           arrives just as the line finishes drawing -- its own short
           fade/scale-in, delayed to land right at the line's end instead
           of just popping in from the start. */
        .ov-wave-badge {
          position: absolute; right: 0; top: 50%; width: 20px; height: 20px; margin-top: -10px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(155deg, var(--jade), var(--jade-deep));
          box-shadow: 0 0 10px 2px rgba(55,226,155,.3);
          opacity: 0; transform: scale(.4);
        }
        .ov-wave-animate .ov-wave-line {
          animation: ovNeonDraw 3.5s var(--e-out) 1 forwards;
        }
        .ov-wave-animate .ov-wave-badge {
          animation: ovWaveBadgeIn .45s var(--e-out) 3.2s 1 forwards;
        }
        @keyframes ovNeonDraw {
          from { transform: translateY(-50%) scaleX(0); }
          to   { transform: translateY(-50%) scaleX(1); }
        }
        @keyframes ovWaveBadgeIn {
          from { opacity: 0; transform: scale(.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        /* Already played once this session (AnimateOnRouteEntry's
           sessionStorage check) -- show the finished state directly, no
           animation, no flash of the collapsed start state first. */
        .ov-wave-done .ov-wave-line { transform: translateY(-50%) scaleX(1); }
        .ov-wave-done .ov-wave-badge { opacity: 1; transform: scale(1); }
        @media (prefers-reduced-motion: reduce) {
          .ov-wave-line { transform: translateY(-50%) scaleX(1); animation: none; }
          .ov-wave-badge { opacity: 1; transform: scale(1); animation: none; }
        }
        @media (max-width: 700px) {
          .ov-wrap { padding: 20px 18px; }
        }
        @media (max-width: 480px) {
          .ov-stats { gap: 8px; }
          .ov-stat-card { padding: 12px; }
          .ov-stat-num { font-size: 20px; }
          .ov-stat-label { font-size: 10.5px; }
          .ov-panel { padding: 14px; }
          /* Was :nth-child(2n) against 8 label spans (every other tick) --
             now there are 24 spans (one per hour, for alignment), so this
             targets the same visual ticks (3, 9, 15, 21) by the class
             applied in JS instead of by position. */
          .ov-hourlabel-thin { display: none; }
          /* Cards are narrow and only 8px apart here, so full-strength
             halos bleed into each other and read as one bright band
             behind the row rather than a glow per card. */
          .ov-stat-card::after { inset: -8px; border-radius: 20px; filter: blur(7px); opacity: .07; }
        }
      `}</style>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: "var(--text-3)", fontSize: 13 }}>{text}</p>;
}
