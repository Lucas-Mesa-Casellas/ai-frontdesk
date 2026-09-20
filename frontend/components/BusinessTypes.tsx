"use client";

import type { ReactNode } from "react";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;
type L10nList = Record<Lang, string[]>;

// Same stroke language as the rest of the site's icons (24px grid, rounded
// 1.7 stroke, currentColor). Each vertical shows a small cluster of glyphs.
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Droplet = () => <Svg><path d="M12 3.5c3.4 4 5.5 6.8 5.5 9.6a5.5 5.5 0 0 1-11 0c0-2.8 2.1-5.6 5.5-9.6Z" /></Svg>;
const Bolt = () => <Svg><path d="M13 3 5.5 13.2h5.3L10 21l8-10.4h-5.4L13 3Z" /></Svg>;
const Flame = () => <Svg><path d="M12 3.2c.6 3 3.6 4.6 3.6 8.3a3.6 3.6 0 0 1-7.2 0c0-1.5.6-2.4 1.3-3.2.4 1 .9 1.5 1.5 1.7-.3-2.6.1-4.6.8-6.8Z" /><path d="M9 19.6h6" /></Svg>;
const Building = () => <Svg><path d="M5 20.5V6.2A1.7 1.7 0 0 1 6.7 4.5h6.6A1.7 1.7 0 0 1 15 6.2v14.3M15 10h2.3a1.7 1.7 0 0 1 1.7 1.7v8.8M3.5 20.5h17M8.5 8.5h3M8.5 12h3M8.5 15.5h3" /></Svg>;
const Key = () => <Svg><circle cx="8" cy="15.5" r="3.6" /><path d="m10.6 12.9 8-8M15.5 7.9l2.4 2.4M13.6 9.9l1.8 1.8" /></Svg>;

const COPY = {
  tag: { EN: "Who it's for", ES: "Para quién es", FR: "Pour qui" } as L10n,
  heading: {
    EN: "Built for businesses like yours.",
    ES: "Hecho para negocios como el tuyo.",
    FR: "Conçu pour des entreprises comme la vôtre.",
  } as L10n,
  sub: {
    EN: "Built and tested with two kinds of business, so it already knows how their calls go.",
    ES: "Creado y probado con dos tipos de negocio, así que ya sabe cómo son sus llamadas.",
    FR: "Conçu et testé avec deux types d'activité, il sait déjà comment leurs appels se déroulent.",
  } as L10n,
};

// Photo slots. No photos ship yet, so the cards are icon-only. To turn them on
// add public/business/trades.jpg and public/business/real-estate.jpg
// (landscape, ~1600x900, dark and moody -- the cards darken them further so
// the text stays readable) and flip this to true. Nothing else changes.
const HAS_PHOTOS = false;

type Vertical = {
  id: string;
  photo: string;
  icons: ReactNode[];
  label: L10n;
  line: L10n;
  // The kinds of calls it captures for this business (these map onto the
  // call types the extraction step actually produces).
  calls: L10nList;
};

// Only what's actually been validated. Adding a vertical later is one more
// entry here -- the grid lays itself out from this list.
const VERTICALS: Vertical[] = [
  {
    id: "trades",
    photo: "/business/trades.jpg",
    icons: [<Droplet key="d" />, <Bolt key="b" />, <Flame key="f" />],
    label: { EN: "Trades", ES: "Oficios", FR: "Artisans" },
    line: {
      EN: "Works well for plumbers, electricians, and heating specialists.",
      ES: "Funciona muy bien para fontaneros, electricistas y especialistas en calefacción.",
      FR: "Idéal pour les plombiers, électriciens et chauffagistes.",
    },
    calls: {
      EN: ["Urgent call-outs", "Appointment requests", "Callback requests"],
      ES: ["Urgencias", "Solicitudes de cita", "Solicitudes de llamada"],
      FR: ["Interventions urgentes", "Demandes de rendez-vous", "Demandes de rappel"],
    },
  },
  {
    id: "property",
    photo: "/business/real-estate.jpg",
    icons: [<Building key="b" />, <Key key="k" />],
    label: { EN: "Real estate", ES: "Inmobiliaria", FR: "Immobilier" },
    line: {
      EN: "Works well for property management and real estate.",
      ES: "Funciona muy bien para la gestión de propiedades y el sector inmobiliario.",
      FR: "Idéal pour la gestion locative et les agences immobilières.",
    },
    calls: {
      EN: ["Viewing requests", "Maintenance issues", "Tenant and owner questions"],
      ES: ["Solicitudes de visita", "Incidencias de mantenimiento", "Consultas de inquilinos y propietarios"],
      FR: ["Demandes de visite", "Problèmes d'entretien", "Questions des locataires et propriétaires"],
    },
  },
];

export default function BusinessTypes({ lang }: { lang: Lang }) {
  return (
    <section className="sec types" id="types">
      <div className="wrap">
        <div className="sec-head mid">
          <div className="sec-tag up">5 / 6 — {COPY.tag[lang]}</div>
          <h2 className="sec-h"><span className="msk"><span>{COPY.heading[lang]}</span></span></h2>
          <p className="sec-sub up d1">{COPY.sub[lang]}</p>
        </div>

        <ul className="bt-grid">
          {VERTICALS.map((v, i) => (
            <li
              key={v.id} className={`bt-card up d${i + 1}${HAS_PHOTOS ? " has-img" : ""}`}
              style={HAS_PHOTOS ? ({ ["--bt-img" as string]: `url(${v.photo})` }) : undefined}
            >
              <span className="bt-icons">
                {v.icons.map((icon, k) => <span key={k} className="bt-ic">{icon}</span>)}
              </span>
              <h3>{v.label[lang]}</h3>
              <p className="bt-line">{v.line[lang]}</p>
              <ul className="bt-calls">
                {v.calls[lang].map((c) => <li key={c}>{c}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        /* Sits a little above the true centre. Done with a transform, not
           extra bottom padding: padding adds to the section's height, which
           pushed this past one screen on short viewports (665px at 640). */
        .sec.types { justify-content: center; }
        .types > .wrap { transform: translateY(-4vh); }
        .types .sec-h { min-height: 0; }
        .types .sec-head { margin-bottom: 34px; }

        .bt-grid {
          list-style: none; display: grid; gap: 20px; max-width: 1080px; margin: 0 auto;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
        }
        .bt-card {
          position: relative; display: flex; flex-direction: column; padding: 34px 34px 30px; border-radius: var(--r-xl);
          background: linear-gradient(180deg, rgba(255,255,255,.048), rgba(255,255,255,.014));
          border: 1px solid rgba(55,226,155,.14);
          box-shadow: 0 40px 80px -44px rgba(0,0,0,.95);
          transition: opacity .9s var(--e-out), transform .4s var(--e-out), border-color .4s var(--e-out), box-shadow .4s var(--e-out);
        }
        .bt-card::before {
          content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(120% 70% at 0% 0%, rgba(55,226,155,.10), transparent 55%);
        }
        .bt-card.has-img { overflow: hidden; }
        /* ::before (not ::after): it comes first in paint order, so the text,
           which is position:relative, paints over it. Replaces the jade glow. */
        .bt-card.has-img::before {
          background:
            linear-gradient(180deg, rgba(7,11,10,.5) 0%, rgba(7,11,10,.88) 62%, rgba(7,11,10,.96) 100%),
            var(--bt-img) center / cover no-repeat;
        }
        .bt-card:hover { transform: translateY(-4px); border-color: rgba(55,226,155,.3); box-shadow: 0 54px 100px -46px rgba(0,0,0,.98); }

        .bt-icons { position: relative; display: flex; gap: 10px; margin-bottom: 24px; }
        .bt-ic {
          width: 64px; height: 64px; border-radius: 18px; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.24);
          box-shadow: 0 14px 30px -16px rgba(18,185,129,.7), 0 1px 0 rgba(255,255,255,.06) inset;
        }
        .bt-ic svg { width: 30px; height: 30px; }
        .bt-ic { transition: box-shadow .4s var(--e-out), border-color .4s var(--e-out); }
        .bt-card:hover .bt-ic {
          border-color: rgba(55,226,155,.42);
          box-shadow: 0 16px 36px -12px rgba(18,185,129,.95), 0 0 22px -4px rgba(55,226,155,.35), 0 1px 0 rgba(255,255,255,.08) inset;
        }
        .bt-card h3 { position: relative; font-size: clamp(1.5rem, 2.2vw, 1.85rem); font-weight: 600; letter-spacing: -.035em; line-height: 1.1; margin-bottom: 10px; }
        .bt-line { position: relative; font-size: 16px; line-height: 1.55; color: var(--text-2); max-width: 42ch; margin-bottom: 22px; min-height: 3.1em; }
        /* The description reserves two lines (min-height above) so the divider
           and chips start at the same height in both cards; the cards stretch
           to equal height, so any spare room lands at the bottom. */
        .bt-calls { position: relative; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; padding-top: 20px; border-top: 1px solid var(--hair); }
        .bt-calls li {
          font-size: 12.5px; font-weight: 500; color: var(--text-2); letter-spacing: -.004em;
          padding: 6px 12px; border-radius: var(--r-pill); background: rgba(255,255,255,.04); border: 1px solid var(--hair);
        }

        @media (max-width: 1000px) {
          .sec.types { justify-content: center; }
          .types > .wrap { transform: none; }
          .bt-card { padding: 28px 24px 24px; }
        }
        @media (max-width: 560px) {
          .bt-ic { width: 56px; height: 56px; border-radius: 16px; }
          .bt-ic svg { width: 26px; height: 26px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bt-card:hover { transform: none; }
        }
      `}</style>
    </section>
  );
}
