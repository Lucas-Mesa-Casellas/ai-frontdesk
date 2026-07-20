"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const SPOKES = 44;
const LANGS = [
  { code: "ES", name: "Español" },
  { code: "EN", name: "English" },
  { code: "FR", name: "Français" },
];

type LangCode = "ES" | "EN" | "FR";

const T: Record<LangCode, {
  navProduct: string; navPricing: string; navContact: string;
  badge: string; h1a: string; h1bPre: string; h1bWord: string; lede: string;
  consoleAria: string;
  r0b: string; r0s: string; r1b: string; r1s: string; r2b: string; r2s: string;
  chip1: string; chip2: string;
  c0: string; c1: string; c2: string;
}> = {
  EN: {
    navProduct: "Product", navPricing: "Pricing", navContact: "Contact",
    badge: "AI receptionist · Multilingual",
    h1a: "Never miss", h1bPre: "another ", h1bWord: "customer",
    lede: "LMC Agents answers every call, understands what the caller needs, and then completes the work that follows. Whatever your business runs on, it gets done automatically, day and night.",
    consoleAria: "A call comes in, the AI understands it, and the resulting automation completes.",
    r0b: "Incoming call", r0s: "··· ··· ··· 214",
    r1b: "Understanding the request", r1s: "Intent, details and context captured",
    r2b: "Automation completed", r2s: "Configured for your business",
    chip1: "Details captured", chip2: "Your workflow, executed",
    c0: "Incoming call", c1: "AI understands", c2: "Automation completed",
  },
  ES: {
    navProduct: "Producto", navPricing: "Precios", navContact: "Contacto",
    badge: "Recepcionista IA · Multilingüe",
    h1a: "Nunca pierdas", h1bPre: "a otro ", h1bWord: "cliente",
    lede: "LMC Agents contesta cada llamada, entiende lo que necesita quien llama y completa el trabajo que sigue. Sea cual sea tu negocio, todo se gestiona automáticamente, día y noche.",
    consoleAria: "Entra una llamada, la IA la entiende, y la automatización correspondiente se completa.",
    r0b: "Llamada entrante", r0s: "··· ··· ··· 214",
    r1b: "Entendiendo la solicitud", r1s: "Intención, datos y contexto capturados",
    r2b: "Automatización completada", r2s: "Configurado para tu negocio",
    chip1: "Datos capturados", chip2: "Tu proceso, ejecutado",
    c0: "Llamada entrante", c1: "La IA entiende", c2: "Automatización completada",
  },
  FR: {
    navProduct: "Produit", navPricing: "Tarifs", navContact: "Contact",
    badge: "Réceptionniste IA · Multilingue",
    h1a: "Ne manquez plus", h1bPre: "un seul ", h1bWord: "client",
    lede: "LMC Agents répond à chaque appel, comprend ce dont l'appelant a besoin, puis termine le travail qui suit. Quelle que soit votre activité, tout est automatisé, jour et nuit.",
    consoleAria: "Un appel arrive, l'IA le comprend, et l'automatisation correspondante se termine.",
    r0b: "Appel entrant", r0s: "··· ··· ··· 214",
    r1b: "Compréhension de la demande", r1s: "Intention, détails et contexte capturés",
    r2b: "Automatisation terminée", r2s: "Configuré pour votre entreprise",
    chip1: "Détails capturés", chip2: "Votre processus, exécuté",
    c0: "Appel entrant", c1: "L'IA comprend", c2: "Automatisation terminée",
  },
};

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<LangCode>("ES");
  const t = T[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [navOpen, setNavOpen] = useState(false);

  // Close on outside click: check event.target against the lang wrapper directly,
  // rather than relying on stopPropagation ordering against React's event delegation
  // (that approach is timing-fragile — this one isn't).
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setNavOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setNavOpen(false); }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const q = (s: string) => root.querySelector(s) as HTMLElement | null;
      const qa = (s: string) => Array.from(root.querySelectorAll(s)) as HTMLElement[];

      const bars = qa(".spoke i");
      const cap = qa(".caption b");
      const segs = qa(".prog i");
      const setCap = (n: number) => cap.forEach((c, k) => c.classList.toggle("on", k === n));

      // progress fills live inside the master timeline so they can never drift
      const fills = segs.map((seg) => {
        const f = document.createElement("span");
        f.style.cssText =
          "position:absolute;inset:0;border-radius:3px;transform-origin:left center;" +
          "background:linear-gradient(90deg,var(--jade-2),var(--jade))";
        seg.appendChild(f);
        gsap.set(f, { scaleX: 0 });
        return f;
      });

      const BEAT = 3.1;
      const OUT = 0.5;
      const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power3.out" } });

      fills.forEach((f, i) => {
        tl.to(f, { scaleX: 1, duration: BEAT, ease: "none" }, i * BEAT);
      });

      /* BEAT 1 — incoming */
      tl.add(() => setCap(0), 0)
        .fromTo(".a-warm", { opacity: 0 }, { opacity: 1, duration: 0.75 }, 0)
        .fromTo("#icPhone", { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, duration: 0.6 }, 0.06)
        .fromTo('.line[data-i="0"]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.65 }, 0.16)
        .fromTo("#rip1", { opacity: 0.7, scale: 0.85 }, { opacity: 0, scale: 2.35, duration: 2.05, ease: "sine.out", repeat: 1 }, 0.12)
        .fromTo("#rip2", { opacity: 0.7, scale: 0.85 }, { opacity: 0, scale: 2.35, duration: 2.05, ease: "sine.out", repeat: 1 }, 1.1)

        /* BEAT 2 — understanding */
        .add(() => setCap(1), BEAT)
        .to(".a-warm", { opacity: 0, duration: OUT, ease: "power2.inOut" }, BEAT - 0.12)
        .to(".a-jade", { opacity: 1, duration: 0.8, ease: "power2.out" }, BEAT - 0.12)
        .to("#icPhone", { opacity: 0, scale: 0.72, duration: 0.38, ease: "power2.in" }, BEAT - 0.12)
        .to('.line[data-i="0"]', { opacity: 0, y: -12, duration: 0.42, ease: "power2.in" }, BEAT - 0.14)
        .to(".radial", { opacity: 1, duration: 0.5 }, BEAT + 0.04)
        .fromTo(bars, { scaleY: 0.16 },
          { scaleY: () => 0.45 + Math.random() * 0.9, duration: 0.62, ease: "power2.out", stagger: { each: 0.011, from: "center" } },
          BEAT + 0.06)
        .fromTo('.line[data-i="1"]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.65 }, BEAT + 0.2)
        .to(bars, { scaleY: () => 0.3 + Math.random() * 0.95, duration: 0.46, ease: "sine.inOut", repeat: 3, yoyo: true, stagger: { each: 0.007, from: "random" } }, BEAT + 0.68)

        /* BEAT 3 — automation completed */
        .add(() => setCap(2), BEAT * 2)
        .to(".a-jade", { opacity: 0, duration: OUT, ease: "power2.inOut" }, BEAT * 2 - 0.1)
        .to(".a-bright", { opacity: 1, duration: 0.7, ease: "power2.out" }, BEAT * 2 - 0.1)
        .to(bars, { scaleY: 0.16, duration: 0.5, ease: "power3.inOut", stagger: { each: 0.006, from: "edges" } }, BEAT * 2 - 0.12)
        .to(".radial", { opacity: 0, duration: 0.42 }, BEAT * 2 + 0.16)
        .to('.line[data-i="1"]', { opacity: 0, y: -12, duration: 0.42, ease: "power2.in" }, BEAT * 2 - 0.12)
        .fromTo("#icCheck", { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2.6)" }, BEAT * 2 + 0.22)
        .fromTo("#icCheck path", { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, BEAT * 2 + 0.34)
        .fromTo('.line[data-i="2"]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.65 }, BEAT * 2 + 0.42)
        .fromTo(".chip-1", { opacity: 0, y: 20, x: 14, scale: 0.93 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.75 }, BEAT * 2 + 0.56)
        .fromTo(".chip-2", { opacity: 0, y: 20, x: -14, scale: 0.93 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.75 }, BEAT * 2 + 0.74)

        /* seamless reset */
        .to(".chip-1", { opacity: 0, y: -12, duration: 0.42, ease: "power2.in" }, BEAT * 3 - 0.62)
        .to(".chip-2", { opacity: 0, y: -12, duration: 0.42, ease: "power2.in" }, BEAT * 3 - 0.56)
        .to("#icCheck", { opacity: 0, scale: 0.72, duration: 0.4, ease: "power2.in" }, BEAT * 3 - 0.5)
        .to('.line[data-i="2"]', { opacity: 0, y: -12, duration: 0.4, ease: "power2.in" }, BEAT * 3 - 0.5)
        .to(".a-bright", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, BEAT * 3 - 0.5)
        .to(fills, { scaleX: 0, duration: 0.35, ease: "power2.inOut" }, BEAT * 3 - 0.38)
        .set({}, {}, BEAT * 3);

      /* tilt */
      const stage = q(".stage");
      const consoleEl = q("#console");
      if (stage && consoleEl && window.matchMedia("(pointer:fine)").matches) {
        const qx = gsap.quickTo(consoleEl, "rotationY", { duration: 0.8, ease: "power3" });
        const qy = gsap.quickTo(consoleEl, "rotationX", { duration: 0.8, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          qx(((e.clientX - r.left) / r.width - 0.5) * 10);
          qy(((e.clientY - r.top) / r.height - 0.5) * -7);
        };
        const leave = () => { qx(0); qy(0); };
        stage.addEventListener("pointermove", move);
        stage.addEventListener("pointerleave", leave);
      }

      /* entrance */
      gsap.from(".copy .badge", { opacity: 0, y: 14, duration: 0.7, delay: 0.05 });
      gsap.from("h1 .l>span", { yPercent: 105, duration: 1.05, stagger: 0.085, delay: 0.1, ease: "power4.out" });
      gsap.from(".lede", { opacity: 0, y: 14, duration: 0.85, delay: 0.34 });
      gsap.from(".stage", { opacity: 0, y: 28, scale: 0.97, duration: 1.15, delay: 0.2, ease: "power3.out" });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="app-shell">
      <div className="env" aria-hidden="true">
        <div className="beam" />
        <div className="floor" />
        <div className="aur aur-1" />
        <div className="aur aur-2" />
        <div className="mesh" />
      </div>
      <svg className="grain" aria-hidden="true">
        <filter id="gn">
          <feTurbulence type="fractalNoise" baseFrequency=".82" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#gn)" opacity=".32" />
      </svg>

      <nav>
        <div className="wrap nav-grid">
          <a href="#" className="logo" aria-label="LMC Agents home">
            {/* ===== LOGO ===== */}
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <g transform="translate(12,12) scale(.92) translate(-12,-12)">
                  <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" strokeWidth="2.8" strokeLinecap="round" />
                  <circle cx="18.6" cy="5.4" r="2.85" fill="#04140D" />
                </g>
              </svg>
            </span>
            <span className="logo-txt">LMC Agents</span>
          </a>

          <div className="nav-links">
            <a href="#product">{t.navProduct}</a>
            <a href="#pricing">{t.navPricing}</a>
            <a href="#contact">{t.navContact}</a>
          </div>

          <div className="nav-right">
            <div className="lang" ref={langRef}>
              <button
                className="lang-btn"
                aria-expanded={menuOpen}
                aria-haspopup="listbox"
                aria-label="Change language"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <svg className="globe" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
                </svg>
                <span>{lang}</span>
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 4.5 6 8l3.5-3.5" />
                </svg>
              </button>
              <div className={`lang-menu${menuOpen ? " open" : ""}`} role="listbox" aria-label="Language">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={lang === l.code}
                    onClick={() => { setLang(l.code as LangCode); setMenuOpen(false); }}
                  >
                    <span className="code">{l.code}</span>
                    {l.name}
                    <svg className="mark" viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                  </button>
                ))}
              </div>
            </div>

            <div ref={mobileNavRef}>
              <button
                className="nav-toggle"
                aria-expanded={navOpen}
                aria-label="Menu"
                onClick={() => setNavOpen((o) => !o)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <line className="l1" x1="4" y1="7" x2="20" y2="7" />
                  <line className="l2" x1="4" y1="12" x2="20" y2="12" />
                  <line className="l3" x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </button>
              <div className={`mobile-nav${navOpen ? " open" : ""}`}>
                <a href="#product" onClick={() => setNavOpen(false)}>{t.navProduct}</a>
                <a href="#pricing" onClick={() => setNavOpen(false)}>{t.navPricing}</a>
                <a href="#contact" onClick={() => setNavOpen(false)}>{t.navContact}</a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="wrap hero">
          <div className="copy">
            <div className="badge"><span className="pip" />{t.badge}</div>

            <h1>
              <span className="l"><span>{t.h1a}</span></span>
              <span className="l"><span>{t.h1bPre}<span className="grad">{t.h1bWord}</span>.</span></span>
            </h1>

            <p className="lede">{t.lede}</p>

            {/* CTA slot: intentionally empty until we have a demo worth showing. */}
            <div className="cta-slot" aria-hidden="true" />
          </div>

          <div className="stage">
            <div className="aura" aria-hidden="true">
              <div className="a-warm" />
              <div className="a-jade" />
              <div className="a-bright" />
            </div>

            <div
              className="console glass"
              id="console"
              role="img"
              aria-label={t.consoleAria}
            >
              <div className="orb">
                <div className="ripple" id="rip1" />
                <div className="ripple" id="rip2" />
                <div className="radial">
                  {Array.from({ length: SPOKES }).map((_, i) => (
                    <span key={i} className="spoke" style={{ transform: `rotate(${(360 / SPOKES) * i}deg)` }}>
                      <i />
                    </span>
                  ))}
                </div>
                <div className="orb-core">
                  <svg className="icon-phone" id="icPhone" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.6 3.8h3.1l1.5 4-2 1.5a11.2 11.2 0 0 0 5.5 5.5l1.5-2 4 1.5v3.1a2 2 0 0 1-2.2 2A15.6 15.6 0 0 1 4.6 6a2 2 0 0 1 2-2.2Z" strokeLinejoin="round" />
                  </svg>
                  <svg className="icon-check" id="icCheck" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5.5 12.4 10 17l8.5-9" />
                  </svg>
                </div>
              </div>

              <div className="readout">
                <div className="line" data-i="0"><b>{t.r0b}</b><span>{t.r0s}</span></div>
                <div className="line" data-i="1"><b>{t.r1b}</b><span>{t.r1s}</span></div>
                <div className="line" data-i="2"><b>{t.r2b}</b><span className="ok">{t.r2s}</span></div>
              </div>

              <div className="prog"><i /><i /><i /></div>
            </div>

            <div className="chips" aria-hidden="true">
              <div className="chip chip-1">
                <span className="tick"><svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg></span>
                {t.chip1}
              </div>
              <div className="chip chip-2">
                <span className="tick"><svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg></span>
                {t.chip2}
              </div>
            </div>

            <div className="caption">
              <b data-c="0">{t.c0}</b><em />
              <b data-c="1">{t.c1}</b><em />
              <b data-c="2">{t.c2}</b>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
