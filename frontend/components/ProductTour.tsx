"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;
type SlideId = "overview" | "calls" | "calendar" | "support";

// The real dashboard screenshots don't exist yet. Until they do this section
// renders placeholder slots and the landing page only shows it behind
// ?tour=preview -- so no placeholder boxes ever reach the public site. Once
// the 12 screenshots are in public/tour/<en|es|fr>/<slide>.png, flip this to
// true (and re-tune the hotspot x/y below against the real images).
export const TOUR_SCREENSHOTS_READY = false;

// Width / height of the screenshots (16:10 = a 1440x900 window). Used for the
// placeholder box and to size the frame so a slide fits one screen.
const ASPECT = 1.6;

type Hotspot = {
  // Position over the screenshot, in % of its width / height.
  x: number;
  y: number;
  note: L10n;
};

type Slide = {
  id: SlideId;
  label: L10n;
  title: L10n;
  blurb: L10n;
  hotspots: Hotspot[];
};

const COPY = {
  tag: { EN: "Dashboard", ES: "Panel de control", FR: "Tableau de bord" } as L10n,
  heading: { EN: "See it in action.", ES: "Míralo en acción.", FR: "Découvrez-le en action." } as L10n,
  hintDesktop: { EN: "Hover the dots to see what each part does.", ES: "Pasa el ratón por los puntos para ver qué hace cada parte.", FR: "Survolez les points pour voir à quoi sert chaque zone." } as L10n,
  hintTouch: { EN: "Tap a dot to see what each part does.", ES: "Toca un punto para ver qué hace cada parte.", FR: "Touchez un point pour voir à quoi sert chaque zone." } as L10n,
  prev: { EN: "Previous", ES: "Anterior", FR: "Précédent" } as L10n,
  next: { EN: "Next", ES: "Siguiente", FR: "Suivant" } as L10n,
};

const SLIDES: Slide[] = [
  {
    id: "overview",
    label: { EN: "Overview", ES: "Resumen", FR: "Aperçu" },
    title: { EN: "Your activity, live.", ES: "Tu actividad, en directo.", FR: "Votre activité, en direct." },
    blurb: {
      EN: "Calls answered, booking requests and the hours your phone rings the most, at a glance.",
      ES: "Llamadas atendidas, solicitudes de cita y las horas en que más suena tu teléfono, de un vistazo.",
      FR: "Appels traités, demandes de rendez-vous et heures où votre téléphone sonne le plus, d'un coup d'œil.",
    },
    hotspots: [
      {
        x: 42, y: 24,
        note: {
          EN: "Calls answered, booking requests and your booking rate, updated as calls come in.",
          ES: "Llamadas atendidas, solicitudes de cita y tu tasa de reserva, al día con cada llamada.",
          FR: "Appels traités, demandes de rendez-vous et taux de réservation, mis à jour à chaque appel.",
        },
      },
      {
        x: 40, y: 62,
        note: {
          EN: "See when your calls come in, hour by hour, so you know when the phone matters most.",
          ES: "Mira cuándo llegan tus llamadas, hora a hora, y sabrás cuándo importa más el teléfono.",
          FR: "Voyez à quelle heure arrivent vos appels, heure par heure, pour savoir quand le téléphone compte le plus.",
        },
      },
    ],
  },
  {
    id: "calls",
    label: { EN: "Calls", ES: "Llamadas", FR: "Appels" },
    title: { EN: "Every call, summarised.", ES: "Cada llamada, resumida.", FR: "Chaque appel, résumé." },
    blurb: {
      EN: "Filter by date and open any call for the AI summary, the full transcript and the caller's details.",
      ES: "Filtra por fecha y abre cualquier llamada para ver el resumen de la IA, la transcripción completa y los datos del llamante.",
      FR: "Filtrez par date et ouvrez n'importe quel appel pour voir le résumé de l'IA, la transcription complète et les coordonnées de l'appelant.",
    },
    hotspots: [
      {
        x: 26, y: 20,
        note: {
          EN: "Pick a date range with the calendar, or just type it.",
          ES: "Elige un rango de fechas en el calendario, o escríbelo directamente.",
          FR: "Choisissez une période dans le calendrier, ou saisissez-la directement.",
        },
      },
      {
        x: 42, y: 42,
        note: {
          EN: "A one-line AI summary of what the caller wanted, so you don't have to listen back.",
          ES: "Un resumen de una línea de lo que quería el llamante, para no tener que volver a escucharlo.",
          FR: "Un résumé en une ligne de ce que voulait l'appelant, sans avoir à réécouter l'appel.",
        },
      },
      {
        x: 70, y: 38,
        note: {
          EN: "Tags show the type of call and whether it needs your review.",
          ES: "Las etiquetas indican el tipo de llamada y si necesita tu revisión.",
          FR: "Les étiquettes indiquent le type d'appel et s'il nécessite votre attention.",
        },
      },
    ],
  },
  {
    id: "calendar",
    label: { EN: "Calendar", ES: "Calendario", FR: "Calendrier" },
    title: { EN: "Booking requests, sorted.", ES: "Solicitudes de cita, ordenadas.", FR: "Demandes de rendez-vous, triées." },
    blurb: {
      EN: "Requests land on your calendar the moment the call ends. Confirm or cancel in a click.",
      ES: "Las solicitudes llegan a tu calendario en cuanto termina la llamada. Confirma o cancela con un clic.",
      FR: "Les demandes arrivent dans votre calendrier dès la fin de l'appel. Confirmez ou annulez en un clic.",
    },
    hotspots: [
      {
        x: 32, y: 50,
        note: {
          EN: "Each day shows how many requests it has, colour-coded by status.",
          ES: "Cada día muestra cuántas solicitudes tiene, con un color según su estado.",
          FR: "Chaque jour indique le nombre de demandes, avec une couleur selon leur statut.",
        },
      },
      {
        x: 78, y: 48,
        note: {
          EN: "Open a day to confirm or cancel each request, or jump to the call behind it.",
          ES: "Abre un día para confirmar o cancelar cada solicitud, o ir a la llamada que la originó.",
          FR: "Ouvrez un jour pour confirmer ou annuler chaque demande, ou accéder à l'appel d'origine.",
        },
      },
    ],
  },
  {
    id: "support",
    label: { EN: "Support", ES: "Soporte", FR: "Assistance" },
    title: { EN: "A human, one message away.", ES: "Una persona, a un mensaje.", FR: "Un humain, à un message." },
    blurb: {
      EN: "Something off? Write to us from your dashboard, screenshots included.",
      ES: "¿Algo no va bien? Escríbenos desde tu panel, con capturas incluidas.",
      FR: "Un souci ? Écrivez-nous depuis votre tableau de bord, captures d'écran comprises.",
    },
    hotspots: [
      {
        x: 40, y: 34,
        note: {
          EN: "Describe the problem or your question. No name or email to fill in, we already know who you are.",
          ES: "Describe el problema o tu duda. Sin nombre ni email que rellenar: ya sabemos quién eres.",
          FR: "Décrivez le problème ou votre question. Pas de nom ni d'email à saisir, nous savons déjà qui vous êtes.",
        },
      },
      {
        x: 36, y: 62,
        note: {
          EN: "Attach a screenshot or a PDF so we can see exactly what you see.",
          ES: "Adjunta una captura o un PDF para que veamos exactamente lo mismo que tú.",
          FR: "Joignez une capture d'écran ou un PDF pour que nous voyions exactement ce que vous voyez.",
        },
      },
    ],
  },
];

export default function ProductTour({ lang }: { lang: Lang }) {
  const [idx, setIdx] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [seen, setSeen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const slide = SLIDES[idx];
  const src = `/tour/${lang.toLowerCase()}/${slide.id}.png`;
  const showReal = TOUR_SCREENSHOTS_READY && !failed[src];

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setSeen(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // An <img> that already failed before React attached onError (a 404 during
  // hydration) never fires it again -- catch that case here.
  useEffect(() => {
    const img = imgRef.current;
    if (showReal && img && img.complete && img.naturalWidth === 0) setFailed((f) => ({ ...f, [src]: true }));
  }, [showReal, src]);

  const go = (n: number) => { setIdx((n + SLIDES.length) % SLIDES.length); setActive(null); };

  const activeNote = active !== null ? slide.hotspots[active]?.note[lang] : null;

  return (
    <section
      ref={rootRef}
      className={`sec tour${seen ? " seen" : ""}`}
      id="tour"
      aria-roledescription="carousel"
      aria-label={COPY.heading[lang]}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(idx - 1);
        else if (e.key === "ArrowRight") go(idx + 1);
        else if (e.key === "Escape") setActive(null);
      }}
    >
      <div className="wrap">
        <div className="sec-head mid tour-head">
          <div className="sec-tag">{COPY.tag[lang]}</div>
          <h2 className="sec-h">{COPY.heading[lang]}</h2>
        </div>

        <div className="tour-nav">
          <button type="button" className="tour-arrow" onClick={() => go(idx - 1)} aria-label={COPY.prev[lang]}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6" /></svg>
          </button>
          <div className="tour-tabs" role="tablist">
            {SLIDES.map((s, i) => (
              <button
                key={s.id} type="button" role="tab" aria-selected={i === idx}
                className={`tour-tab${i === idx ? " on" : ""}`} onClick={() => go(i)}
              >
                {s.label[lang]}
              </button>
            ))}
          </div>
          <button type="button" className="tour-arrow" onClick={() => go(idx + 1)} aria-label={COPY.next[lang]}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
          </button>
        </div>

        <div className="tour-slide" key={`${slide.id}-${lang}`} role="tabpanel">
          <div className="tour-copy">
            <h3>{slide.title[lang]}</h3>
            <p>{slide.blurb[lang]}</p>
          </div>

          <div className="tour-stage">
          <div className="tour-frame" style={{ ["--tour-aspect" as string]: ASPECT }}>
            <div className="tour-chrome" aria-hidden="true"><i /><i /><i /></div>
            <div className="tour-shot" onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}>
              {showReal ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef} src={src} alt={`${slide.label[lang]}`} draggable={false}
                  onError={() => setFailed((f) => ({ ...f, [src]: true }))}
                />
              ) : (
                <div className="tour-ph" role="img" aria-label={`${slide.label[lang]} (placeholder)`}>
                  <span>{slide.id} · {lang} — screenshot goes here</span>
                </div>
              )}

              {slide.hotspots.map((h, i) => (
                <div
                  key={i} className={`hs${active === i ? " open" : ""}`}
                  style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                >
                  <button
                    type="button" className="hs-dot" aria-label={h.note[lang]} aria-expanded={active === i}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive((a) => (a === i ? null : a))}
                    onClick={() => setActive((a) => (a === i ? null : i))}
                  >
                    <span className="hs-ring" aria-hidden="true" />
                    <span className="hs-n">{i + 1}</span>
                  </button>
                  <span role="tooltip" className={`hs-note${h.x > 58 ? " l" : " r"}${h.y > 62 ? " u" : ""}`}>{h.note[lang]}</span>
                </div>
              ))}
            </div>
          </div>

          <p className={`tour-cap${activeNote ? " has-note" : ""}`} aria-live="polite">
            <span className="cap-hint cap-hint-d">{COPY.hintDesktop[lang]}</span>
            <span className="cap-hint cap-hint-t">{COPY.hintTouch[lang]}</span>
            {activeNote && <span className="cap-note">{activeNote}</span>}
          </p>
          </div>
        </div>
      </div>

      <style>{`
        .tour { justify-content: center; }
        .tour-head { margin-bottom: 14px; }
        .tour-head .sec-h { min-height: 0; font-size: clamp(1.9rem, 2.9vw, 2.5rem); }
        .tour-head, .tour-nav, .tour-slide { opacity: 0; transform: translateY(14px); transition: opacity .9s var(--e-out), transform .9s var(--e-out); }
        .tour.seen .tour-head, .tour.seen .tour-nav, .tour.seen .tour-slide { opacity: 1; transform: none; }
        .tour.seen .tour-nav { transition-delay: .08s; }
        .tour.seen .tour-slide { transition-delay: .14s; }

        .tour-nav { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
        .tour-tabs { display: flex; gap: 6px; padding: 5px; border-radius: var(--r-pill); background: rgba(255,255,255,.03); border: 1px solid var(--hair); }
        .tour-tab {
          font-size: 13.5px; font-weight: 500; color: var(--text-3); white-space: nowrap;
          padding: 8px 16px; border-radius: var(--r-pill);
          transition: color .22s var(--e-out), background .22s var(--e-out);
        }
        .tour-tab:hover { color: var(--text); }
        .tour-tab.on { color: #04140D; background: linear-gradient(180deg,#5CEBAF,var(--jade-2)); font-weight: 600; }
        .tour-arrow {
          flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
          border: 1px solid var(--hair-2); background: rgba(255,255,255,.035); color: var(--text-2);
          transition: background .22s var(--e-out), color .22s var(--e-out);
        }
        .tour-arrow:hover { background: rgba(255,255,255,.08); color: var(--text); }
        .tour-arrow svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }

        .tour.seen .tour-slide { animation: tourIn .5s var(--e-out); }
        @keyframes tourIn { from { opacity: .0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        /* Wide screens: title + blurb sit beside the screenshot instead of
           stacked above it, so the frame gets the vertical space. */
        .tour-slide { display: grid; grid-template-columns: minmax(220px, 300px) minmax(0, 1fr); gap: 34px; align-items: center; max-width: 1240px; margin-inline: auto; }
        .tour-copy h3 { font-size: 24px; font-weight: 600; letter-spacing: -.03em; line-height: 1.15; margin-bottom: 10px; }
        .tour-copy p { font-size: 15px; line-height: 1.6; color: var(--text-2); }
        .tour-stage { min-width: 0; }

        /* Sized so the whole slide fits one screen on desktop: width follows
           the available height x the screenshot's aspect ratio. */
        .tour-frame {
          /* 100svh minus everything above/below the screenshot (nav, heading,
             tabs, caption, padding) minus the 30px window chrome, times the
             aspect ratio: keeps the whole slide on one screen. */
          width: min(100%, calc((100svh - 385px) * var(--tour-aspect)));
          min-width: min(100%, 520px);
          margin: 0 auto; border-radius: 16px; overflow: visible;
          background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.016));
          border: 1px solid var(--hair-2);
          box-shadow: 0 50px 100px -50px rgba(0,0,0,.95), 0 0 0 1px rgba(55,226,155,.05);
        }
        .tour-chrome { display: flex; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--hair); }
        .tour-chrome i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.14); }
        .tour-shot { position: relative; border-radius: 0 0 15px 15px; }
        .tour-shot img { display: block; width: 100%; height: auto; border-radius: 0 0 15px 15px; user-select: none; }
        .tour-ph {
          aspect-ratio: var(--tour-aspect); display: grid; place-items: center; border-radius: 0 0 15px 15px;
          background:
            repeating-linear-gradient(0deg, transparent 0 39px, rgba(255,255,255,.035) 39px 40px),
            repeating-linear-gradient(90deg, transparent 0 39px, rgba(255,255,255,.035) 39px 40px),
            linear-gradient(135deg, rgba(18,185,129,.12), rgba(255,255,255,.02));
        }
        .tour-ph span { font-size: 13px; color: var(--text-3); letter-spacing: .04em; text-transform: uppercase; }

        .hs { position: absolute; transform: translate(-50%, -50%); z-index: 2; }
        .hs.open { z-index: 5; }
        .hs-dot {
          position: relative; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
          background: var(--jade); color: #04140D; font-size: 11.5px; font-weight: 700;
          box-shadow: 0 0 0 4px rgba(55,226,155,.22), 0 6px 16px -4px rgba(0,0,0,.6);
          transition: transform .22s var(--e-out);
        }
        .hs-dot:hover, .hs.open .hs-dot { transform: scale(1.12); }
        .hs-dot:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .hs-ring {
          position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--jade);
          animation: hsPulse 2.4s var(--e-out) infinite; pointer-events: none;
        }
        @keyframes hsPulse { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.3); opacity: 0; } }
        .hs-n { position: relative; }
        .hs-note {
          position: absolute; top: 50%; width: 250px; padding: 12px 14px; border-radius: 12px;
          font-size: 13px; line-height: 1.5; color: var(--text); text-align: left;
          background: linear-gradient(180deg, rgba(20,24,31,.98), rgba(13,16,21,.98));
          border: 1px solid rgba(55,226,155,.28);
          box-shadow: 0 24px 50px -20px rgba(0,0,0,.95);
          opacity: 0; pointer-events: none; transform: translateY(-50%) scale(.97);
          transition: opacity .2s var(--e-out), transform .2s var(--e-out);
        }
        .hs-note.r { left: calc(100% + 14px); }
        .hs-note.l { right: calc(100% + 14px); }
        .hs-note.u { top: auto; bottom: 50%; transform: translateY(0) scale(.97); }
        .hs.open .hs-note { opacity: 1; transform: translateY(-50%) scale(1); }
        .hs.open .hs-note.u { transform: translateY(0) scale(1); }

        .tour-cap { margin-top: 14px; text-align: center; font-size: 12.5px; color: var(--text-3); min-height: 1.5em; }
        .cap-hint-t, .cap-note { display: none; }

        /* Not enough width for the side column: stack it, centered. */
        @media (max-width: 1100px) {
          .tour-slide { display: block; }
          .tour-copy { text-align: center; margin-bottom: 14px; }
          .tour-copy h3 { font-size: 19px; margin-bottom: 4px; }
          .tour-copy p { font-size: 14px; max-width: 62ch; margin: 0 auto; }
          .tour-frame { width: 100%; min-width: 0; }
        }
        /* Phones: no hover, and a floating note would run off a 375px screen,
           so the note shows in a caption under the screenshot instead. */
        @media (max-width: 700px) {
          .tour-nav { gap: 8px; }
          .tour-tabs { flex-wrap: wrap; justify-content: center; border-radius: 22px; }
          .tour-tab { padding: 8px 12px; font-size: 13px; }
          .hs-note { display: none; }
          .hs-dot { width: 32px; height: 32px; font-size: 12.5px; }
          .hs-dot::after { content: ""; position: absolute; inset: -7px; } /* 46px tap target */
          .cap-hint-d { display: none; }
          .cap-hint-t { display: inline; }
          .tour-cap.has-note .cap-hint { display: none; }
          .cap-note { display: block; font-size: 14px; line-height: 1.55; color: var(--text); padding: 12px 14px; border-radius: 12px; text-align: left; background: rgba(55,226,155,.07); border: 1px solid rgba(55,226,155,.2); }
        }
        @media (max-width: 480px) {
          .tour-arrow { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tour-head, .tour-nav, .tour-slide { transition: none; opacity: 1; transform: none; }
          .tour.seen .tour-slide { animation: none; }
          .hs-ring { animation: none; }
        }
      `}</style>
    </section>
  );
}
