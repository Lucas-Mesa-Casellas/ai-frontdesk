"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Native <input type="date"> renders its own format and placeholder from
// the browser/OS locale, which nothing in the page can override -- lang on
// the input included (tried, no effect). So the filter uses a plain text
// field with one fixed dd/mm/yyyy format for everyone, and hands the page
// the YYYY-MM-DD it already expects through a hidden field. Typing stays a
// fully valid way to set the date -- the popover calendar below is
// additive, not a replacement for it.
function isoToDisplay(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function displayToIso(value: string) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseIso(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { year: Number(m[1]), month0: Number(m[2]) - 1, day: Number(m[3]) } : null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
// Matches the mobile breakpoint the popover's own CSS switches on (see
// globals.css) -- below this it's a fixed bottom sheet needing no anchor
// position at all, so the desktop branch below is skipped entirely.
const MOBILE_BREAKPOINT = 700;

export default function DateFilterInput({
  name, defaultValue, label, labelStyle, placeholder, locale,
}: {
  name: string;
  defaultValue: string;
  label: string;
  labelStyle: React.CSSProperties;
  // day/month/year order stays dd/mm/yyyy for every locale (matches
  // isoToDisplay/displayToIso above, which don't vary by locale either) --
  // only the placeholder/title TEXT and the popover's month/weekday names
  // localize.
  placeholder: string;
  locale: string;
}) {
  const [text, setText] = useState(() => isoToDisplay(defaultValue));
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const today = new Date();
  const [view, setView] = useState(() => {
    const p = parseIso(displayToIso(isoToDisplay(defaultValue)));
    return p ? { year: p.year, month0: p.month0 } : { year: today.getFullYear(), month0: today.getMonth() };
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const iso = displayToIso(text);
  const selectedIso = parseIso(iso);

  // Needed before the first createPortal call -- document.body doesn't
  // exist yet during SSR, and reaching for it before mount would blow up
  // the server render.
  useEffect(() => setMounted(true), []);

  // The popover is portaled to document.body (see below) specifically to
  // escape .dash-in's finished-but-still-"filled" transform animation on
  // the surrounding <form> -- a CSS Animation with fill-mode: forwards
  // keeps the animated property "in effect" even once it's visually
  // settled at an identity matrix, and ANY transform value (identity or
  // not) makes that ancestor the containing block for position: fixed
  // descendants instead of the real viewport. Without the portal, the
  // mobile bottom sheet below would anchor to the filter form's box
  // instead of the actual screen edge -- caught by testing at 375px, not
  // visible at all on desktop where this popover uses position: absolute
  // against its own immediate (untainted) relative wrapper instead.
  const positionDesktop = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setAnchor(null); // mobile sheet is pure CSS (bottom: 0), no anchor needed
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 8, left: rect.left });
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inContainer && !inPopover) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", positionDesktop);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", positionDesktop);
    };
  }, [open]);

  const openPicker = () => {
    // Jump the visible month to match whatever's currently a valid typed
    // date, rather than leaving it stranded wherever it was last browsed to.
    const p = parseIso(iso);
    setView(p ? { year: p.year, month0: p.month0 } : { year: today.getFullYear(), month0: today.getMonth() });
    positionDesktop();
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month0 + delta, 1);
      return { year: d.getFullYear(), month0: d.getMonth() };
    });
  };

  const selectDay = (day: number) => {
    setText(isoToDisplay(`${view.year}-${pad2(view.month0 + 1)}-${pad2(day)}`));
    setOpen(false);
  };

  const daysInMonth = new Date(view.year, view.month0 + 1, 0).getDate();
  const firstWeekday = (new Date(view.year, view.month0, 1).getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i))
  );
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(view.year, view.month0, 1)
  );

  const isSelected = (day: number) =>
    !!selectedIso && selectedIso.year === view.year && selectedIso.month0 === view.month0 && selectedIso.day === day;
  const isToday = (day: number) =>
    today.getFullYear() === view.year && today.getMonth() === view.month0 && today.getDate() === day;

  const popover = (
    <>
      {open && <div className="datefilter-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div
        ref={popoverRef}
        className={`datefilter-popover${open ? " open" : ""}`}
        role="dialog"
        aria-label={label}
        style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
      >
        <div className="datefilter-head">
          <button type="button" className="datefilter-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
          <span className="datefilter-month">{monthLabel}</span>
          <button type="button" className="datefilter-nav" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
        </div>
        <div className="datefilter-weekdays">
          {weekdayLabels.map((w, i) => <span key={i}>{w}</span>)}
        </div>
        <div className="datefilter-days">
          {cells.map((day, i) =>
            day === null ? (
              <span key={i} />
            ) : (
              <button
                type="button"
                key={i}
                className={`datefilter-day${isSelected(day) ? " selected" : ""}${isToday(day) ? " today" : ""}`}
                onClick={() => selectDay(day)}
              >
                {day}
              </button>
            )
          )}
        </div>
      </div>
    </>
  );

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label style={labelStyle} htmlFor={`date-filter-${name}`}>{label}</label>
      <input
        id={`date-filter-${name}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        // Lenient on purpose: 1/1/2027 is accepted and padded on the way
        // out, so the only thing this blocks is input that isn't a date at
        // all. An empty field skips validation entirely, which is what
        // leaves the filter optional.
        pattern="\d{1,2}/\d{1,2}/\d{4}"
        title={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={openPicker}
        onClick={openPicker}
        className="dash-input"
      />
      {/* Omitted entirely when blank so clearing the field drops the param
          from the query string rather than submitting an empty one. */}
      {iso && <input type="hidden" name={name} value={iso} />}
      {mounted && createPortal(popover, document.body)}
    </div>
  );
}
