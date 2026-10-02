"use client";

import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import type { NoteSlide } from "@/lib/tour-notes";
import { DEMO_COPY, type DemoPage } from "@/lib/demo/copy";
import { IconOverview, IconPhone, IconCalendar, IconSupport } from "@/components/icons";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;

// The four dashboard pages (public/tour/<en|es|fr>/<page>.png, 1440x900,
// rendered from the demo's own sample data): a menu on the left, a large
// screenshot on the right, and one clear button that opens the real, clickable
// demo. The screenshots are clean; the "i" hints live in the demo only.
const SLIDES: { id: NoteSlide; label: L10n; route: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: "overview", label: { EN: "Overview", ES: "Resumen", FR: "Aperçu" }, route: "/dashboard", Icon: IconOverview },
  { id: "calls", label: { EN: "Calls", ES: "Llamadas", FR: "Appels" }, route: "/dashboard/calls", Icon: IconPhone },
  { id: "calendar", label: { EN: "Calendar", ES: "Calendario", FR: "Calendrier" }, route: "/dashboard/calendar", Icon: IconCalendar },
  { id: "support", label: { EN: "Support", ES: "Soporte", FR: "Assistance" }, route: "/dashboard/support", Icon: IconSupport },
];

const COPY = {
  tag: { EN: "Dashboard", ES: "Panel", FR: "Tableau de bord" } as L10n,
  heading: { EN: "This is what you'll have access to.", ES: "Esto es a lo que tendrás acceso.", FR: "Voici à quoi vous aurez accès." } as L10n,
  menu: { EN: "Dashboard pages", ES: "Páginas del panel", FR: "Pages du tableau de bord" } as L10n,
};

export default function ProductTour({ lang, onOpenDemo }: { lang: Lang; onOpenDemo: (page: DemoPage) => void }) {
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const slide = SLIDES[idx];

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setSeen(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      className={`sec tour${seen ? " seen" : ""}`}
      id="tour"
      aria-roledescription="carousel"
      aria-label={COPY.heading[lang]}
    >
      <div className="wrap">
        <div className="sec-head mid tour-head">
          <p className="eyebrow">{COPY.tag[lang]}</p>
          <h2 className="sec-h">{COPY.heading[lang]}</h2>
        </div>

        <div className="tour-grid">
          <div className="tour-side">
            <div className="tour-menu" role="tablist" aria-label={COPY.menu[lang]} aria-orientation="vertical">
              {SLIDES.map((sl, n) => (
                <button
                  key={sl.id} type="button" role="tab" aria-selected={n === idx} className={`tour-tab${n === idx ? " on" : ""}`}
                  onClick={() => setIdx(n)}
                >
                  <sl.Icon width={18} height={18} aria-hidden="true" />
                  {sl.label[lang]}
                </button>
              ))}
            </div>
            {/* the one clear way into the real thing */}
            <button type="button" className="btn-primary tour-try-btn" onClick={() => onOpenDemo(slide.id)}>
              {DEMO_COPY.open[lang]}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>

          <div className="tour-slide" role="tabpanel">
            <div className="tour-frame">
              <div className="tour-chrome">
                <span className="tc-dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="tc-url" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
                  lmcagents.app{slide.route}
                </span>
                <span />
              </div>
              {/* clicking the screenshot opens the demo on that page */}
              <div className="tour-shot" onClick={() => onOpenDemo(slide.id)}>
                {SLIDES.map((sl, n) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${lang}-${sl.id}`} src={`/tour/${lang.toLowerCase()}/${sl.id}.png`} alt={n === idx ? sl.label[lang] : ""}
                    aria-hidden={n === idx ? undefined : true}
                    width={1440} height={900} decoding="async" draggable={false}
                    loading={n === 0 ? "eager" : "lazy"} className={n === idx ? "on" : undefined}
                  />
                ))}
                <span className="tour-open" aria-hidden="true">{DEMO_COPY.open[lang]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .tour-head { margin-bottom: 30px; }
        .tour-head .sec-h { min-height: 0; }
        .tour-head, .tour-grid { opacity: 0; transform: translateY(14px); transition: opacity .8s var(--e-out), transform .8s var(--e-out); }
        .tour.seen .tour-head, .tour.seen .tour-grid { opacity: 1; transform: none; }
        .tour.seen .tour-grid { transition-delay: .1s; }

        .sec.tour { padding: calc(var(--nav-h) + 24px) 0 40px; }

        /* the menu and the button on the left, the screenshot as large as the page allows */
        .tour-grid { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 44px; align-items: center; margin: 0 auto;
          /* as large as the screen's height allows, so the section fits one screen */
          max-width: min(1240px, max(960px, calc((100svh - 296px) * 1.6 + 294px))); }
        .tour-side { display: flex; flex-direction: column; gap: 26px; }
        .tour-menu { display: flex; flex-direction: column; gap: 8px; }
        .tour-tab {
          display: flex; align-items: center; gap: 13px; height: 56px; padding: 0 18px; border-radius: 16px; text-align: left;
          font-size: 15px; font-weight: 500; color: var(--text-3);
          background: rgba(255,255,255,.025); border: 1px solid var(--hair);
          transition: color .2s var(--e-out), background .2s var(--e-out), border-color .2s var(--e-out);
        }
        .tour-tab svg { flex: none; }
        .tour-tab:hover { color: var(--text); background: rgba(255,255,255,.05); }
        .tour-tab.on { color: var(--jade); background: rgba(55,226,155,.085); border-color: rgba(55,226,155,.4); font-weight: 600; box-shadow: 0 0 30px -16px rgba(55,226,155,.7); }
        .tour-tab:focus-visible { outline: 2px solid var(--jade); outline-offset: 2px; }
        .tour-try-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; padding: 0 22px; border-radius: 999px;
          font-size: 15px; font-weight: 600; text-align: center;
        }
        .tour-try-btn svg { flex: none; width: 17px; height: 17px; stroke: currentColor; stroke-width: 2.4; fill: none; stroke-linecap: round; stroke-linejoin: round; transition: transform .25s var(--e-out); }
        .tour-try-btn:hover svg { transform: translateX(3px); }

        .tour-frame {
          width: 100%;
          margin: 0 auto; border-radius: 16px;
          container-type: inline-size;
          background: var(--card-bg), #0A0D11;
          border: 1px solid var(--card-border);
          box-shadow: 0 50px 100px -50px rgba(0,0,0,.95), 0 0 80px -40px rgba(18,185,129,.35);
        }
        .tour-chrome {
          display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; gap: 12px;
          height: 36px; padding: 0 12px; border-bottom: 1px solid var(--hair);
        }
        .tc-dots { display: flex; gap: 6px; }
        .tc-dots i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.14); }
        .tc-url {
          display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 12px; border-radius: 7px;
          font-size: 11.5px; color: var(--text-3); white-space: nowrap; background: rgba(255,255,255,.04); border: 1px solid var(--hair);
        }
        .tc-url svg { width: 11px; height: 11px; stroke: var(--text-3); stroke-width: 1.8; fill: none; stroke-linecap: round; flex: none; }

        .tour-shot { position: relative; aspect-ratio: 1440 / 900; border-radius: 0 0 15px 15px; cursor: pointer; }
        .tour-shot img {
          position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 0 0 15px 15px; user-select: none;
          opacity: 0; transition: opacity .7s var(--e-out); pointer-events: none;
        }
        .tour-shot img.on { opacity: 1; }
        /* a hint on hover (mouse only): the screenshot is a door into the demo */
        .tour-open {
          position: absolute; left: 50%; bottom: 22px; z-index: 1; transform: translate(-50%, 6px); opacity: 0; pointer-events: none;
          padding: 11px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; color: #04140D; white-space: nowrap;
          background: linear-gradient(180deg, var(--jade-bright), var(--jade-2)); box-shadow: 0 14px 34px -10px rgba(0,0,0,.8);
          transition: opacity .25s var(--e-out), transform .25s var(--e-out);
        }
        @media (hover: hover) { .tour-shot:hover .tour-open { opacity: 1; transform: translate(-50%, 0); } }

        @media (max-width: 1000px) {
          .tour-grid { grid-template-columns: minmax(0, 1fr); gap: 22px; max-width: 760px; }
          .tour-side { display: contents; }
          .tour-menu { flex-direction: row; flex-wrap: wrap; justify-content: center; order: 1; }
          .tour-tab { height: 46px; padding: 0 16px; border-radius: 999px; font-size: 14px; }
          .tour-slide { order: 2; }
          .tour-try-btn { order: 3; align-self: center; min-width: min(100%, 320px); }
        }
        @media (max-width: 700px) {
          .sec.tour { padding: max(calc(var(--nav-h) + 20px), clamp(64px, 8vh, 88px)) 0 clamp(48px, 7vh, 72px); min-height: 0; }
          .tour-tab { height: 42px; padding: 0 13px; gap: 8px; font-size: 13.5px; }
          .tour-tab svg { width: 16px; height: 16px; }
          .tc-dots { display: none; }
          .tour-chrome { grid-template-columns: minmax(0,1fr); }
          .tc-url { justify-self: start; max-width: 100%; overflow: hidden; font-size: 10.5px; padding: 0 9px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tour-head, .tour-grid { transition: none; opacity: 1; transform: none; }
          .tour-shot img { transition: none; }
        }
      `}</style>
    </section>
  );
}
