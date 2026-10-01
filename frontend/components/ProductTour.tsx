"use client";

import { useEffect, useRef, useState } from "react";
import { TOUR_NOTES, type NoteSlide } from "@/lib/tour-notes";
import { TOUR_ICONS } from "@/lib/tour-hotspots";
import { DEMO_COPY, type DemoPage } from "@/lib/demo/copy";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;

// A slideshow of the four dashboard pages (public/tour/<en|es|fr>/<page>.png,
// 1440x900, rendered from the demo's own sample data), with one clear button
// that opens the real, clickable demo. Each page has the same small "i" icons
// as the demo, placed after the label each note explains (lib/tour-hotspots.ts).
const SLIDES: { id: NoteSlide; label: L10n; route: string }[] = [
  { id: "overview", label: { EN: "Overview", ES: "Resumen", FR: "Aperçu" }, route: "/dashboard" },
  { id: "calls", label: { EN: "Calls", ES: "Llamadas", FR: "Appels" }, route: "/dashboard/calls" },
  { id: "calendar", label: { EN: "Calendar", ES: "Calendario", FR: "Calendrier" }, route: "/dashboard/calendar" },
  { id: "support", label: { EN: "Support", ES: "Soporte", FR: "Assistance" }, route: "/dashboard/support" },
];

// how long each page stays up
const SLIDE_MS = 5500;

const COPY = {
  tag: { EN: "Dashboard", ES: "Panel", FR: "Tableau de bord" } as L10n,
  heading: { EN: "This is what you'll have access to.", ES: "Esto es a lo que tendrás acceso.", FR: "Voici à quoi vous aurez accès." } as L10n,
  slideshow: { EN: "Dashboard pages", ES: "Páginas del panel", FR: "Pages du tableau de bord" } as L10n,
};

export default function ProductTour({ lang, onOpenDemo }: { lang: Lang; onOpenDemo: (page: DemoPage) => void }) {
  const [idx, setIdx] = useState(0);
  const [openNote, setOpenNote] = useState<{ slide: number; i: number } | null>(null);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  const slide = SLIDES[idx];
  const note = openNote && openNote.slide === idx ? openNote.i : null;
  const icons = TOUR_ICONS[lang][slide.id];

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    if (rm) setSeen(true);
    const io = new IntersectionObserver(
      ([e]) => { setInView(e.isIntersecting); if (e.isIntersecting) setSeen(true); },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Moves on every few seconds while the section is on screen; stops while the
  // pointer is over the screenshot or a note is open, and never runs for people
  // who asked for less motion. Choosing a dot restarts the count.
  const playing = inView && !hover && note === null && !reduced;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, idx]);

  // a tap outside folds an open note away
  useEffect(() => {
    if (note === null) return;
    const away = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest(".tour-ic")) setOpenNote(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenNote(null); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [note]);

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

        {/* the one clear way into the real thing */}
        <div className="tour-try">
          <button type="button" className="btn-primary tour-try-btn" onClick={() => onOpenDemo(slide.id)}>
            {DEMO_COPY.open[lang]}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>

        <div className="tour-slide">
          <div className="tour-frame">
            <div className="tour-chrome">
              <span className="tc-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="tc-url" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
                lmcagents.app{slide.route}
              </span>
              <span />
            </div>
            {/* clicking the screenshot opens the demo on that page (the icons keep their own clicks) */}
            <div
              className="tour-shot"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onClick={(e) => {
                if ((e.target as Element).closest(".tour-ic")) return;
                setOpenNote(null);
                onOpenDemo(slide.id);
              }}
            >
              {SLIDES.map((s, n) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${lang}-${s.id}`} src={`/tour/${lang.toLowerCase()}/${s.id}.png`} alt={n === idx ? s.label[lang] : ""}
                  aria-hidden={n === idx ? undefined : true}
                  width={1440} height={900} decoding="async" draggable={false}
                  loading={n === 0 ? "eager" : "lazy"} className={n === idx ? "on" : undefined}
                />
              ))}
              <span className="tour-open" aria-hidden="true">{DEMO_COPY.open[lang]}</span>

              {icons.map((p, i) => (
                <div key={`${slide.id}-${i}`} className="tour-ic" style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onMouseEnter={() => setOpenNote({ slide: idx, i })}
                  onMouseLeave={() => setOpenNote((o) => (o && o.slide === idx && o.i === i ? null : o))}
                >
                  <button
                    type="button" className={`dh-i${note === i ? " on" : ""}`} aria-expanded={note === i}
                    aria-label={TOUR_NOTES[slide.id][i][lang]}
                    onFocus={() => setOpenNote({ slide: idx, i })}
                    onClick={() => setOpenNote((o) => (o && o.slide === idx && o.i === i ? null : { slide: idx, i }))}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11v5.4M12 7.6v.2" /></svg>
                  </button>
                  {note === i && (
                    <div className={`dh-note${p.x > 55 ? " end" : ""}`} role="note">
                      <p>{TOUR_NOTES[slide.id][i][lang]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* where we are in the slideshow; also a way to jump */}
        <div className="tour-dots" role="group" aria-label={COPY.slideshow[lang]}>
          {SLIDES.map((s, n) => (
            <button
              key={s.id} type="button" className={n === idx ? "on" : undefined}
              aria-label={s.label[lang]} aria-current={n === idx ? "true" : undefined}
              onClick={() => { setIdx(n); setOpenNote(null); }}
            >
              <i />
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .tour-head { margin-bottom: 14px; }
        .tour-head .sec-h { min-height: 0; }
        .tour-head, .tour-try, .tour-slide, .tour-dots { opacity: 0; transform: translateY(14px); transition: opacity .8s var(--e-out), transform .8s var(--e-out); }
        .tour.seen .tour-head, .tour.seen .tour-try, .tour.seen .tour-slide, .tour.seen .tour-dots { opacity: 1; transform: none; }
        .tour.seen .tour-try { transition-delay: .08s; }
        .tour.seen .tour-slide { transition-delay: .14s; }
        .tour.seen .tour-dots { transition-delay: .2s; }

        .sec.tour { padding: calc(var(--nav-h) + 24px) 0 48px; }
        .tour-try { display: flex; justify-content: center; margin: 0 auto 24px; }
        .tour-try-btn {
          display: inline-flex; align-items: center; gap: 10px; height: 52px; padding: 0 28px; border-radius: 999px;
          font-size: 15.5px; font-weight: 600;
        }
        .tour-try-btn svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 2.4; fill: none; stroke-linecap: round; stroke-linejoin: round; transition: transform .25s var(--e-out); }
        .tour-try-btn:hover svg { transform: translateX(3px); }

        /* sized so the whole section (heading, button, screenshot, dots) fits one screen */
        .tour-frame {
          width: min(100%, 760px, calc((100svh - 420px) * 1.6));
          min-width: min(100%, 420px);
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

        .tour-shot { position: relative; aspect-ratio: 1440 / 900; border-radius: 0 0 15px 15px; cursor: pointer; overflow: visible; }
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

        /* the same "i" as in the demo (globals.css), scaled with the screenshot */
        .tour-ic { position: absolute; z-index: 2; width: 0; height: 0; }
        .tour-ic .dh-i {
          width: clamp(16px, 1.45cqw, 22px); height: clamp(16px, 1.45cqw, 22px); margin: 0; left: 0; top: 0; translate: 0 -50%;
        }
        .tour-ic .dh-i svg { width: 62%; height: 62%; }
        .tour-ic .dh-note { left: -10px; top: 18px; width: 270px; max-width: 78cqw; }
        .tour-ic .dh-note.end { left: auto; right: -10px; }

        .tour-dots { display: flex; justify-content: center; gap: 4px; margin-top: 16px; }
        .tour-dots button { width: 28px; height: 28px; display: grid; place-items: center; }
        .tour-dots i { display: block; width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,.22); transition: width .3s var(--e-out), background .3s var(--e-out); }
        .tour-dots button:hover i { background: rgba(255,255,255,.4); }
        .tour-dots button.on i { width: 22px; background: var(--jade); }
        .tour-dots button:focus-visible { outline: 2px solid var(--jade); outline-offset: 1px; border-radius: 8px; }

        @media (max-width: 700px) {
          .sec.tour { padding: max(calc(var(--nav-h) + 20px), clamp(64px, 8vh, 88px)) 0 clamp(48px, 7vh, 72px); min-height: 0; }
          .tour-frame { width: 100%; min-width: 0; }
          .tc-dots { display: none; }
          .tour-chrome { grid-template-columns: minmax(0,1fr); }
          .tc-url { justify-self: start; max-width: 100%; overflow: hidden; font-size: 10.5px; padding: 0 9px; }
          .tour-ic .dh-note { width: min(250px, 72cqw); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tour-head, .tour-try, .tour-slide, .tour-dots { transition: none; opacity: 1; transform: none; }
          .tour-shot img { transition: none; }
        }
      `}</style>
    </section>
  );
}
