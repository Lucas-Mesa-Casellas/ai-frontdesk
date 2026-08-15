"use client";
 
import { useState } from "react";
import Link from "next/link";
import BookingActions from "./BookingActions";

type Booking = {
  id: string; customer_name: string | null; customer_phone: string | null;
  party_size: number | null; notes: string | null; status: string;
  start_time: string | null; urgency: string | null;
};

export default function CalendarClient({
  cells, byDay, weekdayLabels, monthTitle, todayKey, year, month,
  prevHref, nextHref, intlLocale, labels,
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
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selected = selectedDay !== null ? byDay[selectedDay] || [] : null;

  const dotColor = (b: Booking) => {
    if (b.urgency === "high") return "#FF6B6B";
    return b.status === "confirmed" ? "var(--jade)" : "#FFC178";
  };

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 560px", minWidth: 340 }}>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href={prevHref} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 13, color: "var(--text-2)" }}>‹</Link>
            <span style={{ fontSize: 13.5, fontWeight: 600, textTransform: "capitalize", minWidth: 120, textAlign: "center" }}>{monthTitle}</span>
            <Link href={nextHref} style={{ padding: "5px 9px", borderRadius: 8, border: "1px solid var(--hair)", fontSize: 13, color: "var(--text-2)" }}>›</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {weekdayLabels.map((w) => (
            <div key={w} style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textAlign: "center", textTransform: "uppercase", padding: "0 0 4px" }}>{w}</div>
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
                style={{
                  minHeight: 60, borderRadius: 8, padding: 4, textAlign: "left", cursor: day === null ? "default" : "pointer",
                  border: `1px solid ${isSelected ? "var(--jade)" : isToday ? "rgba(55,226,155,.5)" : "var(--hair)"}`,
                  background: day === null ? "transparent" : isSelected ? "rgba(55,226,155,.08)" : "rgba(255,255,255,.018)",
                }}
              >
                {day !== null && (
                  <>
                    <span style={{ fontSize: 10, color: isToday ? "var(--jade)" : "var(--text-3)", fontWeight: isToday ? 700 : 500 }}>{day}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                      {bookings.slice(0, 4).map((b) => (
                        <span key={b.id} style={{ height: 3, borderRadius: 2, background: dotColor(b) }} />
                      ))}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        {selectedDay === null ? (
          <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--hair)", background: "rgba(255,255,255,.02)" }}>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>{labels.calSelectDay}</p>
          </div>
        ) : !selected || selected.length === 0 ? (
          <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--hair)", background: "rgba(255,255,255,.02)" }}>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>{labels.calDayEmpty}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {selected.map((b) => {
              const time = b.start_time
                ? new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit" }).format(new Date(b.start_time))
                : null;
              return (
                <div key={b.id} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--hair)", background: "rgba(255,255,255,.024)" }}>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>
                    {time && <span style={{ fontWeight: 600, marginRight: 6 }}>{time}</span>}
                    {b.customer_name || labels.unknown}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 10 }}>
                    {b.notes || labels.calNoDate}
                    {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                  </p>
                  {b.status === "cancelled" ? (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)" }}>{labels.calCancelled}</span>
                  ) : b.status === "confirmed" ? (
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, color: "var(--jade)", padding: "5px 11px",
                      borderRadius: 999, background: "rgba(55,226,155,.1)", border: "1px solid rgba(55,226,155,.24)",
                    }}>
                      {labels.calConfirmed_}
                    </span>
                  ) : (
                    <BookingActions
                      bookingId={b.id} path="/dashboard/calendar"
                      confirmLabel={labels.calConfirm} confirmingLabel={labels.calConfirming}
                      cancelLabel={labels.calCancel} cancellingLabel={labels.calCancelling}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
