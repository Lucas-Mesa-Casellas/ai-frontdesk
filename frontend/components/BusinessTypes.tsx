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
  tag: { EN: "Businesses", ES: "Negocios", FR: "Entreprises" } as L10n,
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

// Background: a blueprint drawn deep in the card -- a fine dotted grid with
// hairline technical drawing over it, faded out before it reaches the text.
// Trades gets a schematic (a pipe run with a valve, a circuit trace, radiator
// fins); Real estate a floor plan (walls, door swings, windows). Noticed as
// texture, never read as a picture.
const Art = ({ id, children }: { id: string; children: ReactNode }) => (
  <svg className="bt-art" viewBox="0 0 600 400" preserveAspectRatio="xMaxYMid slice" fill="none" aria-hidden="true">
    <defs>
      <pattern id={`bt-grid-${id}`} width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".9" className="bt-grid-dot" />
      </pattern>
    </defs>
    <rect x="260" y="40" width="340" height="320" fill={`url(#bt-grid-${id})`} stroke="none" />
    {children}
  </svg>
);
const TradesArt = () => (
  <Art id="trades">
    {/* pipe run with two rounded elbows (a double wall) and a valve */}
    <path d="M560 96H476a26 26 0 0 0-26 26v126a26 26 0 0 1-26 26h-64" />
    <path d="M560 108H476a14 14 0 0 0-14 14v126a38 38 0 0 1-38 38h-64" />
    <circle cx="456" cy="186" r="11" /><path d="M445 186h22M456 175v22" />
    {/* circuit trace with nodes */}
    <path d="M560 168h-34l-16 16h-28" /><circle cx="478" cy="184" r="3.5" />
    <path d="M560 212h-26l-12-12" /><circle cx="519" cy="197" r="3.5" />
    {/* radiator fins */}
    <path d="M492 250v66M505 250v66M518 250v66M531 250v66M544 250v66M557 250v66" />
    <path d="M486 244h78M486 322h78" />
  </Art>
);
const PropertyArt = () => (
  <Art id="property">
    {/* outer walls (a double line) and interior walls */}
    <rect x="344" y="88" width="220" height="228" />
    <rect x="352" y="96" width="204" height="212" />
    <path d="M352 202h78M430 96v70M430 190v118M430 250h126" />
    {/* door swings */}
    <path d="M430 166a24 24 0 0 1 24 24M430 190h24" />
    <path d="M392 202a22 22 0 0 0-22 22M370 202v22" />
    <path d="M492 250a22 22 0 0 1 22 22M492 250v22" />
    {/* windows on the outer wall */}
    <path d="M470 88v8M522 88v8M470 92h52M564 140h-8M564 182h-8M560 140v42" />
  </Art>
);

type Vertical = {
  id: string;
  art: ReactNode;
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
    art: <TradesArt />,
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
    art: <PropertyArt />,
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
          <p className="eyebrow">{COPY.tag[lang]}</p>
          <h2 className="sec-h"><span className="msk"><span>{COPY.heading[lang]}</span></span></h2>
          <p className="sec-sub up d1">{COPY.sub[lang]}</p>
        </div>

        <ul className="bt-grid">
          {VERTICALS.map((v, i) => (
            <li key={v.id} className={`bt-card up d${i + 1}`}>
              {v.art}
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
        /* Natural height: two cards plus the shared section padding. */
        .types .sec-h { min-height: 0; }

        .bt-grid {
          list-style: none; display: grid; gap: 16px; max-width: 1180px; margin: 0 auto;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
        }
        /* surface, border and hover come from the shared card rules (globals.css) */
        .bt-card { display: flex; flex-direction: column; padding: 34px 34px 30px; overflow: hidden; }
        .bt-card::before {
          content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(120% 70% at 0% 0%, rgba(55,226,155,.08), transparent 55%);
        }
        .bt-art {
          position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
          stroke: rgba(92,235,175,.5); stroke-width: .9; stroke-linecap: round; stroke-linejoin: round;
          opacity: .38; transition: opacity var(--t-med) var(--e-out);
          /* faded on every side: the lines never reach the card's edges (where
             they'd read as a broken border) or the text on the left */
          -webkit-mask-image: radial-gradient(ellipse 30% 44% at 84% 40%, #000 30%, transparent 100%);
                  mask-image: radial-gradient(ellipse 30% 44% at 84% 40%, #000 30%, transparent 100%);
        }
        .bt-card:hover .bt-art { opacity: .6; }
        .bt-grid-dot { fill: rgba(255,255,255,.22); stroke: none; }

        .bt-icons { position: relative; display: flex; gap: 10px; margin-bottom: 24px; }
        .bt-ic {
          width: 64px; height: 64px; border-radius: 18px; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.24);
          box-shadow: 0 14px 30px -16px rgba(18,185,129,.7), 0 1px 0 rgba(255,255,255,.06) inset;
        }
        .bt-ic svg { width: 30px; height: 30px; }
        .bt-ic { transition: box-shadow var(--t-med) var(--e-out), border-color var(--t-med) var(--e-out); }
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
          .bt-card { padding: 28px 24px 24px; }
        }
        @media (max-width: 560px) {
          .bt-ic { width: 56px; height: 56px; border-radius: 16px; }
          .bt-ic svg { width: 26px; height: 26px; }
        }
      `}</style>
    </section>
  );
}
