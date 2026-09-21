"use client";

import { useState } from "react";
import Link from "next/link";
import BookingActions from "./BookingActions";
import DeleteButton from "./DeleteButton";
import TranslatedField from "./TranslatedField";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import { deleteBooking } from "@/lib/dash-actions";
import { BUSINESS_TZ } from "@/lib/tz";

type Booking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  party_size: number | null; notes: string | null; status: string;
  start_time: string | null; urgency: string | null; summary: string | null;
  summaryNeedsTranslation: boolean; call_id: string | null;
};

type UndatedBooking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  summary: string | null; summaryNeedsTranslation: boolean; status: string; call_id: string | null;
};

export default function CalendarClient({
  cells, byDay, weekdayLabels, monthTitle, todayKey, year, month,
  prevHref, nextHref, intlLocale, dashboardLocale, labels, legend, undated, stats,
}: {
  cells: (number | null)[];
  byDay: Record<number, Booking[]>;
  weekdayLabels: string[];
  monthTitle: string;
  todayKey: string;
  year: number;
  month: number;
  prevHref: string;
  nextHref: string;
  intlLocale: string;
  dashboardLocale: string;
  labels: Record<string, string>;
  legend: { pending: string; confirmed: string; cancelled: string; urgency: string };
  undated: UndatedBooking[];
  stats: { total: number; confirmed: number };
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selected = selectedDay !== null ? byDay[selectedDay] || [] : null;

  const dotColor = (b: Booking) => {
    // Cancelled and confirmed are both checked before urgency: either one
    // means this booking is resolved, regardless of the urgency it
    // originally had, so neither should render as high-urgency red -- a
    // confirmed-but-urgent booking previously still showed red, reading as
    // "still needs attention" instead of "already handled."
    if (b.status === "cancelled") return "var(--text-3)";
    if (b.status === "confirmed") return "var(--jade)";
    if (b.urgency === "high") return "#FF6B6B";
    return "#FFC178";
  };

  // Most-to-least attention-worthy, same classification dotColor already
  // makes per booking. A day's bookings are grouped by that color and
  // shown as one count per color present (ordered by this priority) --
  // merging them into a single number would hide that, say, one of two
  // bookings that day was actually cancelled (1 cancelled + 1 confirmed
  // read as a single "2" in jade, losing the cancelled one entirely).
  const DAY_COLOR_PRIORITY = ["#FF6B6B", "#FFC178", "var(--jade)", "var(--text-3)"] as const;
  const dayColorGroups = (dayBookings: Booking[]) => {
    const counts = new Map<string, number>();
    dayBookings.forEach((b) => {
      const c = dotColor(b);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return DAY_COLOR_PRIORITY.filter((c) => counts.has(c)).map((c) => [c, counts.get(c)!] as const);
  };

  const selectedDateLabel = selectedDay !== null
    ? new Intl.DateTimeFormat(intlLocale, { weekday: "short", month: "short", day: "numeric", timeZone: BUSINESS_TZ })
        .format(new Date(Date.UTC(year, month, selectedDay)))
    : null;

  const renderActions = (b: { id: string; status: string }) => (
    <BookingActions
      bookingId={b.id} path="/dashboard/calendar" currentStatus={b.status}
      confirmLabel={labels.calConfirm} confirmingLabel={labels.calConfirming}
      cancelLabel={labels.calCancel} cancellingLabel={labels.calCancelling}
      confirmedLabel={labels.calConfirmed_} cancelledLabel={labels.calCancelled}
      errorLabel={labels.calActionError} changeLabel={labels.calChange}
    />
  );

  const renderDelete = (bookingId: string) => (
    <DeleteButton
      action={() => deleteBooking(bookingId, "/dashboard/calendar")}
      label={labels.calDelete}
      confirmMessage={labels.calDeleteConfirm}
      errorLabel={labels.calActionError}
      className="ui-btn ui-btn--sm cal-delete"
    />
  );

  // One request, dated or undated: who, what they asked, its status, and the
  // actions. Hierarchy: customer -> summary -> status -> actions.
  const renderRequest = (
    b: { id: string; customer_name: string | null; customer_phone: string | null; summary: string | null; summaryNeedsTranslation: boolean; call_id: string | null; status: string },
    time: string | null,
    urgent: boolean,
  ) => (
    <Card key={b.id} className="cal-req">
      <div className="cal-req-top">
        <div className="cal-req-who">
          {time && <span className="cal-req-time">{time}</span>}
          <b>{b.customer_name || labels.unknown}</b>
          {b.customer_phone && <span className="cal-req-phone">{b.customer_phone}</span>}
        </div>
        {urgent && <Badge tone="danger">{legend.urgency}</Badge>}
      </div>
      <p className="cal-req-sum">
        {b.summary ? (
          b.summaryNeedsTranslation && b.call_id ? (
            <TranslatedField callId={b.call_id} locale={dashboardLocale} field="summary" initialText={b.summary} />
          ) : (
            b.summary
          )
        ) : (
          labels.calNoReason
        )}
      </p>
      <div className="cal-req-actions">
        {renderActions(b)}
        <span className="cal-req-more">
          {b.call_id && (
            <Link href={`/dashboard/calls/${b.call_id}`} className="ui-btn ui-btn--secondary ui-btn--sm">
              {labels.calSeeCall} →
            </Link>
          )}
          {renderDelete(b.id)}
        </span>
      </div>
    </Card>
  );

  return (
    <div className="cal-layout">
      {/* ---- the month ---- */}
      <Card as="section" className="dash-in d1 cal-card">
        <div className="cal-head">
          <div className="cal-nav-group">
            <Link href={prevHref} className="cal-nav" aria-label="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14.5 6-6 6 6 6" /></svg>
            </Link>
            <span className="cal-month">{monthTitle}</span>
            <Link href={nextHref} className="cal-nav" aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="cal-legend">
            <span style={{ ["--c" as string]: "#FFC178" }}>{legend.pending}</span>
            <span style={{ ["--c" as string]: "var(--jade)" }}>{legend.confirmed}</span>
            <span style={{ ["--c" as string]: "var(--text-3)" }}>{legend.cancelled}</span>
            <span style={{ ["--c" as string]: "#FF6B6B" }}>{legend.urgency}</span>
          </div>
        </div>

        <div className="cal-weekdays">
          {weekdayLabels.map((w) => <div key={w}>{w}</div>)}
        </div>

        <div className="cal-grid">
          {cells.map((day, i) => {
            const isToday = day !== null && todayKey === `${year}-${month}-${day}`;
            const isSelected = day !== null && day === selectedDay;
            const bookings = day !== null ? byDay[day] || [] : [];
            return (
              <button
                key={i}
                disabled={day === null}
                onClick={() => day !== null && setSelectedDay(day === selectedDay ? null : day)}
                className={`cal-cell${day === null ? " empty" : ""}${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
                aria-pressed={day !== null ? isSelected : undefined}
              >
                {day !== null && (
                  <>
                    <span className="cal-day">{day}</span>
                    {bookings.length > 0 && (
                      // One row per distinct status color that day, stacked
                      // top to bottom in DAY_COLOR_PRIORITY order: the
                      // count next to a short line in that status's color
                      // (echoing the legend's swatches).
                      <span className="cal-inds">
                        {dayColorGroups(bookings).map(([color, count]) => (
                          <span key={color} className="cal-ind" style={{ ["--c" as string]: color }}>
                            <b>{count}</b>
                            <i />
                          </span>
                        ))}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ---- the selected day's requests (or the undated ones) ---- */}
      <div className="cal-side">
        <Card className="dash-in d2 cal-stats">
          <div>
            <p className="cal-stat-n">{stats.total}</p>
            <p className="cal-stat-l">{labels.statThisMonth}</p>
          </div>
          <span className="cal-stat-sep" />
          <div>
            <p className="cal-stat-n cal-stat-ok">{stats.confirmed}</p>
            <p className="cal-stat-l">{labels.statConfirmed}</p>
          </div>
        </Card>

        <p className="cal-side-title">
          {selectedDay !== null ? selectedDateLabel : labels.calUndatedTitle}
        </p>

        <div className="cal-list">
          {selectedDay !== null ? (
            !selected || selected.length === 0 ? (
              <Card className="cal-note"><p>{labels.calDayEmpty}</p></Card>
            ) : (
              selected.map((b) => {
                const time = b.start_time
                  ? new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ }).format(new Date(b.start_time))
                  : null;
                return renderRequest(b, time, b.urgency === "high" && b.status === "pending");
              })
            )
          ) : undated.length === 0 ? (
            <Card className="cal-note"><p>{labels.calSelectDay}</p></Card>
          ) : (
            undated.map((b) => renderRequest(b, null, false))
          )}
        </div>
      </div>

      <style>{`
        /* ---------- layout: month on the left, requests on the right ---------- */
        .cal-layout { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr); gap: 16px; align-items: start; }
        .cal-card { padding: 22px; }
        .cal-card:hover { transform: none; }
        .cal-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; position: sticky; top: 20px; }

        /* ---------- month header ---------- */
        .cal-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 20px; margin-bottom: 18px; }
        .cal-nav-group { display: flex; align-items: center; gap: 10px; }
        .cal-nav {
          width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: var(--text-2);
          border: 1px solid var(--border); background: rgba(255,255,255,.02); text-decoration: none;
          transition: background .2s var(--e-out), border-color .2s var(--e-out), color .2s var(--e-out);
        }
        .cal-nav:hover { background: rgba(255,255,255,.06); border-color: var(--border-strong); color: var(--text); }
        .cal-month { min-width: 150px; text-align: center; font-size: 17px; font-weight: 600; letter-spacing: -.02em; text-transform: capitalize; }
        .cal-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 11.5px; color: var(--text-3); }
        .cal-legend span { display: inline-flex; align-items: center; gap: 7px; }
        .cal-legend span::before { content: ""; width: 14px; height: 3px; border-radius: 2px; background: var(--c); }

        /* ---------- the grid: dark cells, hairlines, room to breathe ---------- */
        .cal-weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-bottom: 8px; }
        .cal-weekdays div { font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); text-align: left; padding: 0 4px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-auto-rows: minmax(88px, auto); gap: 6px; }
        .cal-grid .cal-cell {
          position: relative; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 6px;
          min-width: 0; padding: 9px 10px; border-radius: 12px; text-align: left; overflow: hidden;
          background: rgba(255,255,255,.02); border: 1px solid var(--border); cursor: pointer; transform: none;
          transition: background .18s var(--e-out), border-color .18s var(--e-out), box-shadow .18s var(--e-out);
        }
        .cal-grid .cal-cell:hover:not(:disabled) { background: rgba(255,255,255,.05); border-color: var(--border-strong); transform: none; }
        .cal-grid .cal-cell.empty { background: transparent; border-color: transparent; cursor: default; }
        .cal-grid .cal-cell.today { border-color: rgba(55,226,155,.4); }
        .cal-grid .cal-cell.selected { background: rgba(55,226,155,.075); border-color: var(--jade); box-shadow: 0 0 0 1px rgba(55,226,155,.25), 0 0 26px -14px rgba(55,226,155,.7); }
        .cal-day { font-size: 12.5px; font-weight: 500; color: var(--text-2); font-variant-numeric: tabular-nums; }
        .cal-cell.today .cal-day { display: inline-grid; place-items: center; min-width: 24px; height: 24px; padding: 0 6px; margin: -3px 0 -3px -4px; border-radius: 999px; color: #04140D; font-weight: 700; background: var(--jade); }
        .cal-inds { display: flex; flex-direction: column; gap: 3px; width: 100%; }
        .cal-ind { display: flex; align-items: center; gap: 6px; color: var(--c); line-height: 1; }
        .cal-ind b { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .cal-ind i { flex: none; width: 14px; height: 3px; border-radius: 2px; background: var(--c); }

        /* ---------- side: stats, then the requests ---------- */
        .cal-stats { display: flex; align-items: center; gap: 22px; padding: 16px 20px; }
        .cal-stats:hover { transform: none; }
        .cal-stat-n { font-size: 24px; font-weight: 600; letter-spacing: -.03em; line-height: 1; font-variant-numeric: tabular-nums; }
        .cal-stat-ok { color: var(--jade); }
        .cal-stat-l { font-size: 12px; color: var(--text-3); margin-top: 5px; }
        .cal-stat-sep { width: 1px; align-self: stretch; background: var(--border); }
        .cal-side-title { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); margin: 6px 2px 0; }
        .cal-list { display: flex; flex-direction: column; gap: 10px; }
        .cal-note { padding: 18px; }
        .cal-note:hover { transform: none; }
        .cal-note p { font-size: 13px; color: var(--text-3); }

        .cal-req { padding: 18px; }
        .cal-req:hover { transform: none; }
        .cal-req-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
        .cal-req-who { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; min-width: 0; }
        .cal-req-time { font-size: 12.5px; font-weight: 600; color: var(--jade); font-variant-numeric: tabular-nums; }
        .cal-req-who b { font-size: 14.5px; font-weight: 600; letter-spacing: -.01em; }
        .cal-req-phone { font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums; }
        .cal-req-sum { font-size: 13px; line-height: 1.55; color: var(--text-2); margin-bottom: 14px; }
        .cal-req-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px 14px; padding-top: 14px; border-top: 1px solid var(--border); }
        .cal-req-more { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        /* Delete is the quietest control: no fill, no border, muted red on hover. */
        .cal-delete { color: #E5877B; background: transparent; border-color: transparent; }
        .cal-delete:hover:not(:disabled) { background: rgba(239,68,68,.1); }

        /* BookingActions (rendered only here) */
        .ba-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .ba-col { display: flex; flex-direction: column; gap: 6px; }
        .ba-change { font-size: 12px; font-weight: 500; }
        .ba-error { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #E5877B; }

        /* ---------- narrower: recompose, don't just shrink ---------- */
        @media (max-width: 1100px) {
          .cal-layout { grid-template-columns: minmax(0, 1fr); }
          .cal-side { position: static; }
        }
        @media (max-width: 700px) {
          .cal-card { padding: 14px; }
          .cal-grid { gap: 4px; grid-auto-rows: minmax(58px, auto); }
          .cal-weekdays { gap: 4px; }
          .cal-weekdays div { text-align: center; padding: 0; font-size: 9.5px; letter-spacing: .04em; }
          .cal-grid .cal-cell { padding: 6px 4px; gap: 3px; align-items: center; border-radius: 10px; }
          .cal-day { font-size: 11.5px; }
          .cal-ind { gap: 3px; }
          .cal-ind i { width: 9px; }
          .cal-month { min-width: 0; font-size: 15px; }
          .cal-legend { gap: 4px 12px; }
        }
      `}</style>
    </div>
  );
}
