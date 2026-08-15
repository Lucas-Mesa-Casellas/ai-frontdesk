"use client";

import { useState } from "react";
import Link from "next/link";
import BookingActions from "./BookingActions";

type Booking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  party_size: number | null; notes: string | null; status: string;
  start_time: string | null; urgency: string | null;
};

type UndatedBooking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  notes: string | null; status: string;
};

export default function CalendarClient({
  cells, byDay, weekdayLabels, monthTitle, todayKey, year, month,
  prevHref, nextHref, intlLocale, labels, legend, undated,
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
  labels: Record<string, string>;
  legend: { pending: string; confirmed: string; urgency: string };
  undated: UndatedBooking[];
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selected = selectedDay !== null ? byDay[selectedDay] || [] : null;

  const dotColor = (b: Booking) => {
    if (b.urgency === "high") return "#FF6B6B";
    return b.status === "confirmed" ? "var(--jade)" : "#FFC178";
  };

  const renderActions = (b: { id: string; status: string }) => {
    if (b.status === "cancelled") {
      return <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>{labels.calCancelled}</span>;
    }
    if (b.status === "confirmed") {
      return (
        <span style={{
          fontSize: 11, fontWeight: 600, color: "var(--jade)", padding: "4px 10px",
          borderRadius: 999, background: "rgba(55,226,155,.1)", border: "1px solid rgba(55,226,155,.24)",
        }}>
          {labels.calConfirmed_}
        </span>
      );
    }
    return (
      <BookingActions
        bookingId={b.id} path="/dashboard/calendar"
        confirmLabel={labels.calConfirm} confirmingLabel={labels.calConfirming}
        cancelLabel={labels.calCancel} cancellingLabel={labels.calCancelling}
      />
    );
  };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 520px", minWidth: 300 }}>
        <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href={prevHref} className="cal-nav" style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, color: "var(--text-2)", textDecoration: "none" }}>‹</Link>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", minWidth: 110, textAlign: "center" }}>{monthTitle}</span>
            <Link href={nextHref} className="cal-nav" style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 14, color: "var(--text-2)", textDecoration: "none" }}>›</Link>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-3)", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "#FFC178" }} />
              {legend.pending}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "var(--jade)" }} />
              {legend.confirmed}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 14, height: 2.5, borderRadius: 2, background: "#FF6B6B" }} />
              {legend.urgency}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {weekdayLabels.map((w) => (
            <div key={w} style={{ fontSize: 9.5, fontWeight: 600, color: "var(--text-3)", textAlign: "center", textTransform: "uppercase", padding: "0 0 2px", letterSpacing: "0.04em" }}>{w}</div>
          ))}
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
                  minHeight: 46, borderRadius: 8, padding: 3, textAlign: "left", cursor: day === null ? "default" : "pointer",
                  border: `1px solid ${isSelected ? "var(--jade)" : isToday ? "rgba(55,226,155,.45)" : "var(--hair)"}`,
                  background: day === null ? "transparent" : isSelected ? "rgba(55,226,155,.08)" : "rgba(255,255,255,.018)",
                  transition: "all .15s var(--e-out)",
                }}
              >
                {day !== null && (
                  <>
                    <span style={{ fontSize: 10, color: isToday ? "var(--jade)" : "var(--text-3)", fontWeight: isToday ? 700 : 500 }}>{day}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1.5, marginTop: 3 }}>
                      {bookings.slice(0, 4).map((b) => (
                        <span key={b.id} style={{ height: 2.5, borderRadius: 2, background: dotColor(b) }} />
                      ))}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: "1 1 260px", minWidth: 240, maxHeight: 380, display: "flex", flexDirection: "column" }}>
        {selectedDay !== null ? (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {monthTitle} {selectedDay}
            </p>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {!selected || selected.length === 0 ? (
                <div className="dash-card" style={{ padding: 12, borderRadius: 12 }}>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)" }}>{labels.calDayEmpty}</p>
                </div>
              ) : (
                selected.map((b) => {
                  const time = b.start_time
                    ? new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit" }).format(new Date(b.start_time))
                    : null;
                  return (
                    <div key={b.id} className="dash-card" style={{ padding: 10, borderRadius: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                        {time && <span style={{ fontWeight: 600, marginRight: 6 }}>{time}</span>}
                        {b.customer_name || labels.unknown}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
                        {b.notes || labels.calNoDate}
                        {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                      </p>
                      {renderActions(b)}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {labels.calUndatedTitle}
            </p>
            {undated.length === 0 ? (
              <div className="dash-card" style={{ padding: 12, borderRadius: 12 }}>
                <p style={{ fontSize: 12.5, color: "var(--text-3)" }}>{labels.calSelectDay}</p>
              </div>
            ) : (
              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {undated.map((b) => (
                  <div key={b.id} className="dash-card" style={{ padding: 10, borderRadius: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{b.customer_name || labels.unknown}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
                      {b.notes || labels.calNoDate}
                      {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                    </p>
                    {renderActions(b)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
