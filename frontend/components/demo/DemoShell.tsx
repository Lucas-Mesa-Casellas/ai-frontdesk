"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { TOUR_NOTES, DEMO_DETAIL_NOTE, type L10n, type TourLang } from "@/lib/tour-notes";
import { DEMO_COPY, DEMO_MSG } from "@/lib/demo/copy";

// Everything that only exists in the demo, mounted by the dashboard layout when
// proxy.ts has put it in demo mode. The dashboard pages themselves are the real
// ones; this adds four things around them:
//   1. write controls do nothing and say so ("Disabled in the demo");
//   2. in-demo navigation replaces history entries, so the browser's Back
//      button closes the demo overlay instead of stepping through its pages;
//   3. numbered hints, reusing the notes of the product tour;
//   4. the bridge to the overlay on the landing page (Esc, "Home", hints toggle).
// It reads nothing and writes nothing on a server.

type HintDef = { sel: string; note: L10n };

// An "i" sits right after the text of the label or heading each note explains.
function pageOf(pathname: string): { id: string; hints: HintDef[] } {
  const rest = pathname.replace(/^\/demo/, "").replace(/\/$/, "");
  if (rest === "") {
    return { id: "overview", hints: [
      { sel: ".ov-stats .ov-stat-card:nth-child(2) .ov-stat-label", note: TOUR_NOTES.overview[0] },
      { sel: ".ov-chartcard .ov-h2", note: TOUR_NOTES.overview[1] },
    ] };
  }
  if (rest === "/calls") {
    return { id: "calls", hints: [
      { sel: ".calls-toolbar label", note: TOUR_NOTES.calls[0] },
      { sel: ".call-thead span:nth-child(3)", note: TOUR_NOTES.calls[1] },
      { sel: ".call-thead span:nth-child(4)", note: TOUR_NOTES.calls[2] },
    ] };
  }
  if (/^\/calls\/[^/]+$/.test(rest)) {
    return { id: "detail", hints: [{ sel: ".cd-main .cd-sec:nth-child(2) .cd-title", note: DEMO_DETAIL_NOTE }] };
  }
  if (rest === "/calendar") {
    return { id: "calendar", hints: [
      { sel: ".cal-legend span:last-child", note: TOUR_NOTES.calendar[0] },
      { sel: ".cal-side-title", note: TOUR_NOTES.calendar[1] },
    ] };
  }
  if (rest === "/support") {
    return { id: "support", hints: [
      { sel: "label[for=sup-msg]", note: TOUR_NOTES.support[0] },
      { sel: "label[for=sup-files]", note: TOUR_NOTES.support[1] },
    ] };
  }
  return { id: "other", hints: [] };
}

type Pos = { x: number; y: number } | null;

const noop = () => () => {};

export default function DemoShell({ locale }: { locale: "en" | "es" | "fr" }) {
  const lang = locale.toUpperCase() as TourLang;
  const pathname = usePathname();
  const router = useRouter();
  const page = pageOf(pathname);

  // client-only facts, read without an effect: is this page inside the overlay's
  // iframe, and which hints were dismissed earlier in this tab
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const framed = useSyncExternalStore(noop, () => window.parent !== window, () => true);
  const [toast, setToast] = useState(false);
  const [hintsOn, setHintsOn] = useState(true);
  const [positions, setPositions] = useState<{ path: string; list: Pos[] }>({ path: "", list: [] });
  const [openAt, setOpenAt] = useState<{ path: string; i: number } | null>(null);
  const open = openAt && openAt.path === pathname ? openAt.i : null;
  const setOpen = useCallback((i: number | null) => setOpenAt(i === null ? null : { path: pathname, i }), [pathname]);

  const [vw, setVw] = useState(1200);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  const exit = (hash?: string) => {
    if (window.parent !== window) window.parent.postMessage({ [DEMO_MSG]: "close", to: hash }, window.location.origin);
    else window.location.href = "/" + (hash ?? "");
  };

  // 2. in-demo navigation never adds a history entry (the overlay owns Back)
  useEffect(() => {
    const h = window.history;
    const original = h.pushState;
    h.pushState = (...args: Parameters<History["pushState"]>) => h.replaceState(...args);
    return () => { h.pushState = original; };
  }, []);

  // 1. and 4. write controls, filter form, Home link, Escape
  useEffect(() => {
    const note = () => {
      setToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 2300);
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return;
      if (el.closest("[data-demo-write]")) { e.preventDefault(); e.stopPropagation(); note(); return; }
      const exitLink = el.closest("[data-demo-exit]");
      if (exitLink) { e.preventDefault(); e.stopPropagation(); exit(); }
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target instanceof HTMLFormElement ? e.target : null;
      if (!form) return;
      e.preventDefault();
      e.stopPropagation();
      if (!form.hasAttribute("data-demo-ok")) { note(); return; }
      // the calls filter: a plain GET form, replayed as an in-app navigation
      const params = new URLSearchParams();
      new FormData(form).forEach((v, k) => { if (typeof v === "string" && v) params.set(k, v); });
      const qs = params.toString();
      router.replace(window.location.pathname + (qs ? `?${qs}` : ""));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector(".cmdk, .datefilter-popover.open")) return; // the jump-to palette and the date picker close first
      if (window.parent !== window) window.parent.postMessage({ [DEMO_MSG]: "close" }, window.location.origin);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [router]);

  // messages from the overlay
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !e.data || typeof e.data !== "object") return;
      if (e.data[DEMO_MSG] === "hints") setHintsOn(!!e.data.on);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // 3. where each hint sits: measured from the real page, re-measured as it changes
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const { hints } = pageRef.current;
      setVw(window.innerWidth);
      setPositions({ path: pathname, list: hints.map((h) => {
        const el = document.querySelector(h.sel);
        if (!el) return null;
        const sx = window.scrollX, sy = window.scrollY;
        // the last line of the element's text, not the whole (maybe wider) box
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter((q) => q.width > 0);
        const last = rects[rects.length - 1] ?? el.getBoundingClientRect();
        if (last.width === 0 && last.height === 0) return null;
        return { x: last.right + sx + 9, y: last.top + last.height / 2 + sy };
      }) });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    schedule();
    const timers = [setTimeout(schedule, 350), setTimeout(schedule, 1100)];
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    const main = document.querySelector(".dash-main");
    const mo = new MutationObserver(schedule);
    if (main) mo.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  // a tap anywhere else (or Escape) folds the open hint away
  useEffect(() => {
    if (open === null) return;
    const away = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest(".dh")) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); e.stopPropagation(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc, true); };
  }, [open, setOpen]);

  const hints = page.hints;

  const layer = (
    <>
      {hintsOn && positions.path === pathname && positions.list.map((pos, i) => {
        if (!pos || !hints[i]) return null;
        const isOpen = open === i;
        const noteW = Math.min(270, vw - 24);
        // the note opens just under the icon, kept inside the screen
        const left = Math.max(window.scrollX + 12, Math.min(pos.x - 10, window.scrollX + vw - noteW - 12));
        return (
          <div key={i} className="dh">
            <button
              type="button" className={`dh-i${isOpen ? " on" : ""}`} style={{ left: pos.x, top: pos.y }}
              aria-expanded={isOpen} aria-label={`${DEMO_COPY.hintN[lang]} ${i + 1}`}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v5.4M12 7.6v.2" /></svg>
            </button>
            {isOpen && (
              <div className="dh-note" role="note" style={{ left, top: pos.y + 20, width: noteW }}>
                <p>{hints[i].note[lang]}</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <>
      {mounted && createPortal(layer, document.body)}
      {toast && <div className="dm-toast" role="status">{DEMO_COPY.disabled[lang]}</div>}
      {!framed && (
        <div className="dm-pill">
          <span>{DEMO_COPY.bar[lang]}</span>
          <Link href="/#pricing">{DEMO_COPY.start[lang]}</Link>
        </div>
      )}
      <style>{`
        .dm-toast {
          position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 90;
          padding: 10px 16px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--text);
          background: rgba(20,24,31,.97); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 16px 40px -14px rgba(0,0,0,.9);
          animation: dhIn .18s var(--e-out);
        }
        /* the open phone menu has the screen to itself */
        body:has(.dash-aside.open) .dm-pill { display: none; }
        .dm-pill {
          position: fixed; left: 16px; bottom: 16px; z-index: 90; display: flex; align-items: center; gap: 12px;
          padding: 8px 10px 8px 14px; border-radius: 999px; font-size: 12.5px; color: var(--text-2);
          background: rgba(20,24,31,.97); border: 1px solid rgba(255,255,255,.12);
        }
        .dm-pill a { color: #04140D; font-weight: 600; padding: 5px 12px; border-radius: 999px; background: var(--jade); text-decoration: none; }
        @media (prefers-reduced-motion: reduce) { .dh-note, .dm-toast { animation: none; } }
      `}</style>
    </>
  );
}
