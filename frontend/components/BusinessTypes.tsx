"use client";

import type { ReactNode } from "react";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;

// Same stroke language as the rest of the site's icons (24px grid, rounded
// 1.7 stroke, currentColor). Each vertical shows a small cluster of glyphs.
const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Droplet = () => <Svg><path d="M12 3.5c3.4 4 5.5 6.8 5.5 9.6a5.5 5.5 0 0 1-11 0c0-2.8 2.1-5.6 5.5-9.6Z" /></Svg>;
const Bolt = () => <Svg><path d="M13 3 5.5 13.2h5.3L10 21l8-10.4h-5.4L13 3Z" /></Svg>;
const Flame = () => <Svg><path d="M12 3.2c.6 3 3.6 4.6 3.6 8.3a3.6 3.6 0 0 1-7.2 0c0-1.5.6-2.4 1.3-3.2.4 1 .9 1.5 1.5 1.7-.3-2.6.1-4.6.8-6.8Z" /><path d="M9 19.6h6" /></Svg>;
const Building = () => <Svg><path d="M5 20.5V6.2A1.7 1.7 0 0 1 6.7 4.5h6.6A1.7 1.7 0 0 1 15 6.2v14.3M15 10h2.3a1.7 1.7 0 0 1 1.7 1.7v8.8M3.5 20.5h17M8.5 8.5h3M8.5 12h3M8.5 15.5h3" /></Svg>;
const Key = () => <Svg><circle cx="8" cy="15.5" r="3.6" /><path d="m10.6 12.9 8-8M15.5 7.9l2.4 2.4M13.6 9.9l1.8 1.8" /></Svg>;

type Vertical = {
  id: string;
  icons: ReactNode[];
  label: L10n;
  line: L10n;
};

// Only what's actually been validated. Adding a vertical later is one more
// entry here -- the row lays itself out from this list.
const VERTICALS: Vertical[] = [
  {
    id: "trades",
    icons: [<Droplet key="d" />, <Bolt key="b" />, <Flame key="f" />],
    label: { EN: "Trades", ES: "Oficios", FR: "Artisans" },
    line: {
      EN: "Works well for plumbers, electricians, and heating specialists.",
      ES: "Funciona muy bien para fontaneros, electricistas y especialistas en calefacción.",
      FR: "Idéal pour les plombiers, électriciens et chauffagistes.",
    },
  },
  {
    id: "property",
    icons: [<Building key="b" />, <Key key="k" />],
    label: { EN: "Real estate", ES: "Inmobiliaria", FR: "Immobilier" },
    line: {
      EN: "Works well for property management and real estate.",
      ES: "Funciona muy bien para la gestión de propiedades y el sector inmobiliario.",
      FR: "Idéal pour la gestion locative et les agences immobilières.",
    },
  },
];

export default function BusinessTypes({ lang }: { lang: Lang }) {
  return (
    <>
      <ul className="bt-row up d3">
        {VERTICALS.map((v) => (
          <li key={v.id} className="bt-badge">
            <span className="bt-icons">
              {v.icons.map((icon, i) => <span key={i} className="bt-ic">{icon}</span>)}
            </span>
            <span className="bt-text">
              <b>{v.label[lang]}</b>
              <span>{v.line[lang]}</span>
            </span>
          </li>
        ))}
      </ul>

      <style>{`
        .bt-row {
          list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;
          margin-top: 22px;
        }
        .bt-badge {
          flex: 1 1 320px; max-width: 460px; display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; border-radius: var(--r-lg);
          background: linear-gradient(180deg, rgba(255,255,255,.038), rgba(255,255,255,.012));
          border: 1px solid var(--hair);
        }
        .bt-icons { display: flex; gap: 5px; flex: none; }
        .bt-ic {
          width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.2);
        }
        .bt-ic svg { width: 16px; height: 16px; }
        .bt-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .bt-text b { font-size: 13.5px; font-weight: 600; letter-spacing: -.01em; color: var(--text); }
        .bt-text span { font-size: 12.5px; line-height: 1.45; color: var(--text-2); }
        @media (max-width: 560px) {
          .bt-badge { flex-basis: 100%; padding: 14px 16px; align-items: flex-start; flex-direction: column; gap: 10px; }
        }
      `}</style>
    </>
  );
}
