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

type Anchor = "r" | "l" | "tr" | "br";
type HintDef = { sel: string; at: Anchor; dx?: number; dy?: number; note: L10n };

function pageOf(pathname: string): { id: string; hints: HintDef[] } {
  const rest = pathname.replace(/^\/demo/, "").replace(/\/$/, "");
  if (rest === "") {
    return { id: "overview", hints: [
      { sel: ".ov-stats .ov-stat-card:nth-child(2)", at: "r", dx: -10, note: TOUR_NOTES.overview[0] },
      { sel: ".ov-chartcard", at: "tr", dx: -26, dy: 30, note: TOUR_NOTES.overview[1] },
    ] };
  }
  if (rest === "/calls") {
    return { id: "calls", hints: [
      { sel: ".calls-toolbar input", at: "r", dx: 14, note: TOUR_NOTES.calls[0] },
      { sel: ".call-tr .cr-sum", at: "l", dx: -16, note: TOUR_NOTES.calls[1] },
      { sel: ".call-tr .cr-out", at: "r", dx: 18, note: TOUR_NOTES.calls[2] },
    ] };
  }
  if (/^\/calls\/[^/]+$/.test(rest)) {
    return { id: "detail", hints: [{ sel: ".cd-main .cd-sec:nth-child(2)", at: "tr", dx: -16, dy: 22, note: DEMO_DETAIL_NOTE }] };
  }
  if (rest === "/calendar") {
    return { id: "calendar", hints: [
      { sel: ".cal-cell:has(.cal-inds)", at: "br", dx: -4, dy: -4, note: TOUR_NOTES.calendar[0] },
      { sel: ".cal-list", at: "tr", dx: -22, dy: 22, note: TOUR_NOTES.calendar[1] },
    ] };
  }
  if (rest === "/support") {
    return { id: "support", hints: [
      { sel: "#sup-msg", at: "br", dx: -26, dy: -26, note: TOUR_NOTES.support[0] },
      { sel: ".sup-card .ui-btn--secondary", at: "r", dx: 24, note: TOUR_NOTES.support[1] },
    ] };
  }
  return { id: "other", hints: [] };
}

const STORE = "lmc-demo-dismissed";
function writeDismissed(list: string[]) {
  try { sessionStorage.setItem(STORE, JSON.stringify(list)); } catch { /* storage unavailable: hints just come back */ }
}

type Pos = { x: number; y: number } | null;

const noop = () => () => {};
const readDismissedSnapshot = () => sessionStorageString();
function sessionStorageString() {
  try { return sessionStorage.getItem(STORE) || "[]"; } catch { return "[]"; }
}

export default function DemoShell({ locale }: { locale: "en" | "es" | "fr" }) {
  const lang = locale.toUpperCase() as TourLang;
  const pathname = usePathname();
  const router = useRouter();
  const page = pageOf(pathname);

  // client-only facts, read without an effect: is this page inside the overlay's
  // iframe, and which hints were dismissed earlier in this tab
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const framed = useSyncExternalStore(noop, () => window.parent !== window, () => true);
  const storedDismissed = useSyncExternalStore(noop, readDismissedSnapshot, () => "[]");
  const [toast, setToast] = useState(false);
  const [hintsOn, setHintsOn] = useState(true);
  const [dismissedNow, setDismissedNow] = useState<string[]>([]);
  const [positions, setPositions] = useState<{ path: string; list: Pos[] }>({ path: "", list: [] });
  const [openAt, setOpenAt] = useState<{ path: string; i: number } | null>(null);
  const open = openAt && openAt.path === pathname ? openAt.i : null;
  const setOpen = useCallback((i: number | null) => setOpenAt(i === null ? null : { path: pathname, i }), [pathname]);
  let stored: string[] = [];
  try { stored = JSON.parse(storedDismissed); } catch { /* ignore */ }
  const dismissed = [...stored, ...dismissedNow];
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
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return null;
        const sx = window.scrollX, sy = window.scrollY;
        let x = r.right, y = r.top + r.height / 2;
        if (h.at === "l") { x = r.left; }
        else if (h.at === "tr") { y = r.top; }
        else if (h.at === "br") { y = r.bottom; }
        return { x: x + sx + (h.dx ?? 0), y: y + sy + (h.dy ?? 0) };
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

  const dismiss = (i: number) => {
    const key = `${page.id}:${i}`;
    const next = [...dismissed, key];
    setDismissedNow((d) => [...d, key]);
    writeDismissed(next);
    setOpen(null);
  };

  const narrow = vw <= 600;
  const hints = page.hints;

  const layer = (
    <>
      {hintsOn && positions.path === pathname && positions.list.map((pos, i) => {
        if (!pos || !hints[i] || dismissed.includes(`${page.id}:${i}`)) return null;
        const isOpen = open === i;
        const noteW = Math.min(260, vw - 24);
        // the note opens towards the middle of the screen, and stays on it
        let left = pos.x > vw * 0.55 ? pos.x - 18 - noteW : pos.x + 18;
        let top = pos.y - 6;
        if (narrow) { left = window.scrollX + (vw - noteW) / 2; top = pos.y + 24; }
        left = Math.max(window.scrollX + 12, Math.min(left, window.scrollX + vw - noteW - 12));
        return (
          <div key={i} className="dh">
            <button
              type="button" className={`dh-dot${isOpen ? " on" : ""}`} style={{ left: pos.x, top: pos.y }}
              aria-expanded={isOpen} aria-label={`${DEMO_COPY.hintN[lang]} ${i + 1}`}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="dh-ring" aria-hidden="true" />
              <span className="dh-n">{i + 1}</span>
            </button>
            {isOpen && (
              <div className="dh-note" role="note" style={{ left, top, width: noteW }}>
                <p><b>{i + 1}</b>{hints[i].note[lang]}</p>
                <button type="button" className="dh-got" onClick={() => dismiss(i)}>{DEMO_COPY.gotIt[lang]}</button>
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
        .dh-dot {
          position: absolute; z-index: 60; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%;
          display: grid; place-items: center; background: var(--jade); color: #04140D; font-size: 12px; font-weight: 700;
          box-shadow: 0 0 0 4px rgba(55,226,155,.22), 0 6px 16px -4px rgba(0,0,0,.6);
          transition: transform .2s var(--e-out);
        }
        .dh-dot::after { content: ""; position: absolute; inset: -8px; } /* 44px tap target */
        .dh-dot:hover, .dh-dot.on { transform: scale(1.12); }
        .dh-dot:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .dh-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--jade); animation: dhPulse 2.4s var(--e-out) infinite; pointer-events: none; }
        @keyframes dhPulse { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.2); opacity: 0; } }
        .dh-n { position: relative; }
        .dh-note {
          position: absolute; z-index: 61; padding: 13px 14px 12px; border-radius: 12px;
          background: linear-gradient(180deg, rgba(20,24,31,.98), rgba(13,16,21,.98)); border: 1px solid rgba(55,226,155,.3);
          box-shadow: 0 24px 50px -20px rgba(0,0,0,.95); color: var(--text);
          animation: dhIn .18s var(--e-out);
        }
        @keyframes dhIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .dh-note p { font-size: 13px; line-height: 1.5; margin: 0; }
        .dh-note p b {
          display: inline-grid; place-items: center; width: 18px; height: 18px; margin-right: 8px; border-radius: 50%;
          font-size: 10.5px; color: #04140D; background: var(--jade); vertical-align: 1px;
        }
        .dh-got {
          margin-top: 10px; font-size: 12px; font-weight: 600; color: var(--jade); padding: 5px 10px; border-radius: 8px;
          border: 1px solid rgba(55,226,155,.3); background: rgba(55,226,155,.07);
        }
        .dh-got:hover { background: rgba(55,226,155,.14); }
        .dm-toast {
          position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 90;
          padding: 10px 16px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--text);
          background: rgba(20,24,31,.97); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 16px 40px -14px rgba(0,0,0,.9);
          animation: dhIn .18s var(--e-out);
        }
        .dm-pill {
          position: fixed; left: 16px; bottom: 16px; z-index: 90; display: flex; align-items: center; gap: 12px;
          padding: 8px 10px 8px 14px; border-radius: 999px; font-size: 12.5px; color: var(--text-2);
          background: rgba(20,24,31,.97); border: 1px solid rgba(255,255,255,.12);
        }
        .dm-pill a { color: #04140D; font-weight: 600; padding: 5px 12px; border-radius: 999px; background: var(--jade); text-decoration: none; }
        @media (prefers-reduced-motion: reduce) { .dh-ring { animation: none; } .dh-note, .dm-toast { animation: none; } }
      `}</style>
    </>
  );
}
