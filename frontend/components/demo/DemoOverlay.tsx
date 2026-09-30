"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEMO_COPY, DEMO_MSG, DEMO_PATH, type DemoPage } from "@/lib/demo/copy";

type Lang = "EN" | "ES" | "FR";

// The interactive demo of the client dashboard, as a full-screen overlay on the
// landing page. Inside it is an iframe of /demo, which is the real dashboard
// rendered with sample data (see proxy.ts, lib/demo/*). Loaded lazily: nothing
// here, and nothing of the demo itself, is downloaded until someone opens it.
//
// Closing: the close button, Escape (also from inside the frame, which reports
// it here), and the browser's Back button. Opening adds one history entry and
// Back pops it; pages inside the demo never add entries (components/demo/
// DemoShell.tsx), so one Back always means "leave the demo".
export default function DemoOverlay({
  lang, page, onClose,
}: { lang: Lang; page: DemoPage; onClose: (scrollTo?: string) => void }) {
  const [hints, setHints] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const pendingTo = useRef<string | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  const hintsRef = useRef(hints);
  useEffect(() => { onCloseRef.current = onClose; hintsRef.current = hints; });

  // ask to close: pop our history entry (which closes via popstate), or close
  // straight away if it is somehow already gone
  const requestClose = useCallback((to?: string) => {
    pendingTo.current = to;
    if (window.history.state && window.history.state.lmcDemo) window.history.back();
    else onCloseRef.current(to);
  }, []);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.history.pushState({ ...(window.history.state || {}), lmcDemo: true }, "");

    const onPop = () => onCloseRef.current(pendingTo.current);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); requestClose(); } };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || !e.data || typeof e.data !== "object") return;
      if (e.data[DEMO_MSG] === "close") requestClose(typeof e.data.to === "string" ? e.data.to : undefined);
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    window.addEventListener("message", onMsg);

    // the page underneath neither scrolls nor takes focus while the demo is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const inerted: HTMLElement[] = [];
    Array.from(document.body.children).forEach((el) => {
      if (el instanceof HTMLElement && !el.hasAttribute("data-demo-root") && !el.hasAttribute("inert") && el.tagName !== "SCRIPT") {
        el.setAttribute("inert", ""); inerted.push(el);
      }
    });
    closeBtn.current?.focus();

    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMsg);
      document.body.style.overflow = prevOverflow;
      inerted.forEach((el) => el.removeAttribute("inert"));
      opener?.focus?.({ preventScroll: true });
    };
  }, [requestClose]);

  const tellFrame = useCallback((on: boolean) => {
    frameRef.current?.contentWindow?.postMessage({ [DEMO_MSG]: "hints", on }, window.location.origin);
  }, []);
  useEffect(() => { tellFrame(hints); }, [hints, tellFrame]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="dmo" data-demo-root="" role="dialog" aria-modal="true" aria-label={DEMO_COPY.title[lang]}>
      <div className="dmo-backdrop" onClick={() => requestClose()} />
      <div className="dmo-panel">
        <div className="dmo-bar">
          <span className="dmo-badge"><i aria-hidden="true" />{DEMO_COPY.bar[lang]}</span>
          <div className="dmo-actions">
            <button type="button" className={`dmo-hints${hints ? " on" : ""}`} aria-pressed={hints} onClick={() => setHints((h) => !h)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.1" /></svg>
              {DEMO_COPY.hints[lang]}
            </button>
            <button type="button" className="dmo-start" onClick={() => requestClose("pricing")}>{DEMO_COPY.start[lang]}</button>
            <button ref={closeBtn} type="button" className="dmo-close" aria-label={DEMO_COPY.close[lang]} onClick={() => requestClose()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </div>
        <div className="dmo-view">
          {!loaded && <p className="dmo-loading">{DEMO_COPY.loading[lang]}</p>}
          <iframe
            ref={frameRef} title={DEMO_COPY.title[lang]} src={DEMO_PATH[page]}
            onLoad={() => { setLoaded(true); tellFrame(hintsRef.current); }}
          />
        </div>
      </div>

      <style>{`
        .dmo { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; animation: dmoIn .22s var(--e-out); }
        @keyframes dmoIn { from { opacity: 0; } to { opacity: 1; } }
        .dmo-backdrop { position: absolute; inset: 0; background: rgba(2,4,6,.78); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        /* about 90% of the screen on a desktop; the whole screen on a phone */
        .dmo-panel {
          position: relative; width: 90vw; height: 90vh; height: 90dvh; max-width: 1760px;
          display: flex; flex-direction: column; overflow: hidden; border-radius: 18px;
          background: #06080B; border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 60px 120px -40px rgba(0,0,0,.95), 0 0 120px -50px rgba(18,185,129,.45);
          animation: dmoUp .28s var(--e-out);
        }
        @keyframes dmoUp { from { transform: translateY(14px) scale(.985); } to { transform: none; } }
        .dmo-bar {
          flex: none; height: 46px; display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 0 8px 0 16px; border-bottom: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.025);
        }
        .dmo-badge { display: inline-flex; align-items: center; gap: 9px; min-width: 0; font-size: 12.5px; font-weight: 500; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dmo-badge i { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--jade); box-shadow: 0 0 0 3px rgba(55,226,155,.2); }
        .dmo-actions { flex: none; display: flex; align-items: center; gap: 8px; }
        .dmo-hints {
          display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 999px;
          font-size: 12px; font-weight: 500; color: var(--text-3); border: 1px solid rgba(255,255,255,.12); background: transparent;
          transition: color .2s, border-color .2s, background .2s;
        }
        .dmo-hints svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; }
        .dmo-hints.on { color: var(--jade); border-color: rgba(55,226,155,.4); background: rgba(55,226,155,.08); }
        .dmo-start {
          height: 30px; padding: 0 14px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: #04140D;
          background: linear-gradient(180deg, var(--jade-bright), var(--jade-2));
        }
        .dmo-close { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: var(--text-2); }
        .dmo-close:hover { background: rgba(255,255,255,.08); color: var(--text); }
        .dmo-close svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 2.2; fill: none; stroke-linecap: round; }
        .dmo button:focus-visible { outline: 2px solid var(--jade); outline-offset: 2px; }
        .dmo-view { position: relative; flex: 1; min-height: 0; }
        .dmo-view iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #06080B; }
        .dmo-loading { position: absolute; inset: 0; display: grid; place-items: center; font-size: 13px; color: var(--text-3); }

        @media (max-width: 700px), (max-height: 500px) {
          .dmo-panel { width: 100vw; height: 100vh; height: 100dvh; max-width: none; border-radius: 0; border: 0; }
          .dmo-backdrop { display: none; }
          .dmo-bar { height: 44px; padding-left: 12px; }
          .dmo-hints { padding: 0 9px; }
          .dmo-hints { font-size: 0; gap: 0; }        /* just the icon, to leave room for the label */
          .dmo-hints svg { width: 15px; height: 15px; }
        }
        @media (max-width: 380px) { .dmo-badge { font-size: 11.5px; } .dmo-start { padding: 0 11px; } }
        @media (prefers-reduced-motion: reduce) { .dmo, .dmo-panel { animation: none; } }
      `}</style>
    </div>,
    document.body,
  );
}
