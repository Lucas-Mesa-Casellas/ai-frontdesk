"use client";

import { useState } from "react";
import Link from "next/link";
import BookingActions from "./BookingActions";
import DeleteButton from "./DeleteButton";
import TranslatedField from "./TranslatedField";
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
  // makes per booking -- a day with a mix of statuses shows the count in
  // whichever color the "most urgent" booking that day would get on its
  // own, not a new precedence rule.
  const DAY_COLOR_PRIORITY = ["#FF6B6B", "#FFC178", "var(--jade)", "var(--text-3)"] as const;
  const dayColor = (dayBookings: Booking[]) => {
    const present = new Set(dayBookings.map(dotColor));
    return DAY_COLOR_PRIORITY.find((c) => present.has(c)) ?? "var(--text-3)";
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
      className="cal-link-box-danger"
      style={{ fontSize: 11.5 }}
    />
  );

  return (
    <div className="cal-layout" style={{ width: "100%" }}>
      <div className="cal-grid-col">
        <div className="cal-grid-head" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 8, flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href={prevHref} className="cal-nav" style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, color: "var(--text-2)", textDecoration: "none" }}>‹</Link>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", minWidth: 110, textAlign: "center" }}>{monthTitle}</span>
            <Link href={nextHref} className="cal-nav" style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, color: "var(--text-2)", textDecoration: "none" }}>›</Link>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-3)", alignItems: "center", flexWrap: "wrap", rowGap: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "#FFC178" }} />
              {legend.pending}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "var(--jade)" }} />
              {legend.confirmed}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "var(--text-3)" }} />
              {legend.cancelled}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "#FF6B6B" }} />
              {legend.urgency}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, flex: "none" }}>
          {weekdayLabels.map((w) => (
            <div key={w} style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-3)", textAlign: "center", textTransform: "uppercase", padding: "0 0 4px", letterSpacing: "0.04em" }}>{w}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: `repeat(${cells.length / 7}, minmax(44px, 1fr))`, gap: 3, flex: 1, minHeight: 0 }}>
          {cells.map((day, i) => {
            const isToday = day !== null && todayKey === `${year}-${month}-${day}`;
            const isSelected = day !== null && day === selectedDay;
            const bookings = day !== null ? byDay[day] || [] : [];
            return (
              <button
                key={i}
                disabled={day === null}
                onClick={() => day !== null && setSelectedDay(day === selectedDay ? null : day)}
                className={`cal-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                style={{
                  borderRadius: 8, padding: 4, textAlign: "left", cursor: day === null ? "default" : "pointer",
                  border: `1px solid ${isSelected ? "var(--jade)" : isToday ? "rgba(55,226,155,.45)" : "var(--hair)"}`,
                  background: day === null ? "transparent" : isSelected ? "rgba(55,226,155,.08)" : "rgba(255,255,255,.018)",
                  transition: "all .15s var(--e-out)", overflow: "hidden",
                }}
              >
                {day !== null && (
                  <>
                    <span style={{ fontSize: 10, color: isToday ? "var(--jade)" : "var(--text-3)", fontWeight: isToday ? 700 : 500 }}>{day}</span>
                    {bookings.length > 0 && (
                      // A flex row centered as a group -- not just this one
                      // number centered on its own -- so it stays correct
                      // if this ever needs to show more than one figure
                      // side by side instead of a single merged count.
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 4, width: "100%" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: dayColor(bookings) }}>{bookings.length}</span>
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cal-agenda-col" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{
          display: "flex", gap: 16, padding: "10px 14px", borderRadius: 12, marginBottom: 10, flex: "none",
          border: "1px solid var(--hair)", background: "rgba(255,255,255,.022)",
        }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1 }}>{stats.total}</p>
            <p style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>{labels.statThisMonth}</p>
          </div>
          <div style={{ width: 1, background: "var(--hair)" }} />
          <div>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1, color: "var(--jade)" }}>{stats.confirmed}</p>
            <p style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>{labels.statConfirmed}</p>
          </div>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em", flex: "none" }}>
          {selectedDay !== null ? selectedDateLabel : labels.calUndatedTitle}
        </p>

        <div className="cal-agenda-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedDay !== null ? (
            !selected || selected.length === 0 ? (
              <div className="dash-card" style={{ padding: 12, borderRadius: 12 }}>
                <p style={{ fontSize: 12.5, color: "var(--text-3)" }}>{labels.calDayEmpty}</p>
              </div>
            ) : (
              selected.map((b) => {
                const time = b.start_time
                  ? new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TZ }).format(new Date(b.start_time))
                  : null;
                return (
                  <div key={b.id} className="dash-card cal-booking-card" style={{ padding: 10, borderRadius: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                      {time && <span style={{ fontWeight: 600, marginRight: 6 }}>{time}</span>}
                      {b.customer_name || labels.unknown}
                      {b.customer_phone && (
                        <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-3)" }}> · {b.customer_phone}</span>
                      )}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
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
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
                      {renderActions(b)}
                      {b.call_id && (
                        <Link href={`/dashboard/calls/${b.call_id}`} className="cal-link-box" style={{ fontSize: 11.5 }}>
                          {labels.calSeeCall} →
                        </Link>
                      )}
                      {renderDelete(b.id)}
                    </div>
                  </div>
                );
              })
            )
          ) : undated.length === 0 ? (
            <div className="dash-card" style={{ padding: 12, borderRadius: 12 }}>
              <p style={{ fontSize: 12.5, color: "var(--text-3)" }}>{labels.calSelectDay}</p>
            </div>
          ) : (
            undated.map((b) => (
              <div key={b.id} className="dash-card cal-booking-card" style={{ padding: 10, borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {b.customer_name || labels.unknown}
                  {b.customer_phone && (
                    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--text-3)" }}> · {b.customer_phone}</span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10 }}>
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
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
                  {renderActions(b)}
                  {b.call_id && (
                    <Link href={`/dashboard/calls/${b.call_id}`} className="cal-link-box" style={{ fontSize: 11.5 }}>
                      {labels.calSeeCall} →
                    </Link>
                  )}
                  {renderDelete(b.id)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .cal-layout { display: flex; gap: 18px; flex: 1; min-height: 0; }
        .cal-grid-col { flex: 1.4 1 0; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
        .cal-agenda-col { flex: 1 1 0; min-width: 220px; }
        .cal-agenda-list { overflow-y: auto; min-height: 0; }
        /* .dash-card:hover (globals.css) lifts the card with translateY(-2px)
           -- fine for clickable cards elsewhere, but these booking-detail
           boxes aren't clickable themselves (just a container around the
           Confirm/Cancel buttons), so the shift read as spurious movement.
           Cancels only the transform; border-color/box-shadow hover
           feedback from .dash-card:hover still applies untouched. Combined
           selector (not a bare .cal-booking-card:hover) so specificity
           beats .dash-card:hover regardless of source order. */
        .dash-card.cal-booking-card:hover { transform: none; }
        @media (max-width: 700px) {
          .cal-layout { flex-direction: column; gap: 16px; }
          .cal-grid-col { flex: none; width: 100%; }
          .cal-agenda-col { flex: none; width: 100%; min-width: 0; }
          .cal-agenda-list { overflow-y: visible; min-height: auto; }
          .cal-grid-head { gap: 6px 12px; }
        }
      `}</style>
    </div>
  );
}
