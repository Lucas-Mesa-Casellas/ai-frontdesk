"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ProductTour from "@/components/ProductTour";
import VoiceSamples from "@/components/VoiceSamples";
import BusinessTypes from "@/components/BusinessTypes";

const SPOKES = 44;
type LangCode = "EN" | "ES" | "FR";
const ORDER: LangCode[] = ["EN", "ES", "FR"];
const SHOW_SOON = false; // upcoming-feature rows (SMS confirmation) stay out of the cards

// Three equal plans: no plan is marked as the recommended one (there's no
// customer data yet to back that claim), so they share one card and one CTA.
const TIERS = [
  { price: "99", calls: 50, over: "1,40€" },
  { price: "199", calls: 150, over: "1,20€" },
  { price: "399", calls: 400, over: "0,95€" },
];

type Feat = { t: string; soon?: boolean };

type Dict = {
  navProduct: string; navPricing: string; navContact: string;
  navLogin: string; navStart: string; langName: string;
  badge: string; h1a: string; h1bPre: string; h1bWord: string; lede: string;
  heroCta: string; heroCta2: string;
  feat24: string; featLang: string; featCal: string;
  consoleAria: string;
  r0b: string; r0s: string; r1b: string; r1s: string;
  outcomes: [string, string][];
  chip1: string; chip2: string; chipT1: string; chipT2: string; c0: string; c1: string; c2: string; cue: string;
  pTag: string; pH: string; pSub: string;
  tName: [string, string, string]; tPin: string; tMo: string; tCalls: string;
  tOver: string; tOverSuf: string; tInh: (n: string) => string; soon: string;
  tCta: [string, string, string]; soonGroup: string;
  feats: [Feat[], Feat[], Feat[]];
  cTag: string; cH: string; cSub: string;
  fName: string; fBiz: string; fEmail: string; fPhone: string;
  fMsg: string; fMsgPh: string;
  cSend: string; cSending: string; cSent: string; cError: string; cTrust: string;
  cTagline: string;
};

const T: Record<LangCode, Dict> = {
  EN: {
    navProduct: "Product", navPricing: "Pricing", navContact: "Contact",
    navLogin: "Client access", navStart: "Get started", langName: "English",
    badge: "AI receptionist · Multilingual",
    h1a: "Never miss", h1bPre: "another ", h1bWord: "customer",
    lede: "LMC Agents answers every call, understands what the caller needs, acts on it, then tells you what happened. Day and night.",
    heroCta: "Request a demo", heroCta2: "See pricing",
    feat24: "24/7 availability", featLang: "Multiple languages", featCal: "Requests land in your calendar",
    consoleAria: "A call comes in, the AI understands it, and the right action is taken.",
    r0b: "Incoming call", r0s: "··· ··· ··· 214",
    r1b: "Understanding the request", r1s: "Intent, details and context captured",
    outcomes: [
      ["Booking request captured", "Sent to you instantly"],
      ["Caller's question answered", "From your business details"],
      ["Message taken for the team", "Sent to you instantly"],
      ["Opening hours confirmed", "No call needed from you"],
    ],
    chip1: "Details captured", chip2: "You're notified",
    chipT1: "Call answered", chipT2: "New booking request",
    c0: "Incoming call", c1: "AI understands", c2: "Action taken", cue: "Scroll",

    pTag: "Pricing", pH: "Pricing that scales with you.",
    pSub: "Every plan answers 24/7 in English, Spanish and French. Choose the call volume that fits.",
    tName: ["Starter", "Pro", "Premium"],
    tPin: "Recommended", tMo: "/month", tCalls: "calls a month",
    tCta: ["Get started", "Get started", "Get started"], soonGroup: "Coming next quarter",
    tOver: "then", tOverSuf: "per extra call",
    tInh: (n) => `Everything in ${n}, plus`, soon: "Soon",
    feats: [
      [{ t: "Answers 24/7" },
       { t: "Spanish, English and French" },
       { t: "Answers questions about your business" },
       { t: "Captures booking requests straight to your dashboard" },
       { t: "Several callers answered at the same time" },
       { t: "SMS confirmation sent to the customer", soon: true }],
      [{ t: "Answers 24/7" },
       { t: "Spanish, English and French" },
       { t: "Answers questions about your business" },
       { t: "Captures booking requests straight to your dashboard" },
       { t: "Several callers answered at the same time" },
       { t: "SMS confirmation sent to the customer", soon: true }],
      [{ t: "Answers 24/7" },
       { t: "Spanish, English and French" },
       { t: "Answers questions about your business" },
       { t: "Captures booking requests straight to your dashboard" },
       { t: "Several callers answered at the same time" },
       { t: "SMS confirmation sent to the customer", soon: true }],
    ],

    cTag: "Contact", cH: "Let's talk.",
    cSub: "Leave your details and we'll get back to you within 24 hours.",
    fName: "Your name", fBiz: "Business", fEmail: "Email", fPhone: "Phone",
    fMsg: "Message",
    fMsgPh: "Tell us a little about your business and how you handle the phone today.",
    cSend: "Send message", cSending: "Sending…", cSent: "Sent", cError: "Couldn't send, try again", cTrust: "Built in Europe",
    cTagline: "Smarter calls. Happier customers.",
  },
  ES: {
    navProduct: "Producto", navPricing: "Precios", navContact: "Contacto",
    navLogin: "Acceso de clientes", navStart: "Empezar", langName: "Español",
    badge: "Recepcionista IA · Multilingüe",
    h1a: "Nunca pierdas", h1bPre: "a otro ", h1bWord: "cliente",
    lede: "LMC Agents contesta cada llamada, entiende qué necesita el llamante, actúa en consecuencia, y te informa de lo que ha pasado. De día y de noche.",
    heroCta: "Solicitar una demo", heroCta2: "Ver precios",
    feat24: "Disponible 24/7", featLang: "Varios idiomas", featCal: "Las solicitudes llegan a tu calendario",
    consoleAria: "Entra una llamada, la IA la entiende, y se ejecuta la acción correcta.",
    r0b: "Llamada entrante", r0s: "··· ··· ··· 214",
    r1b: "Entendiendo la solicitud", r1s: "Intención, datos y contexto identificados",
    outcomes: [
      ["Solicitud de cita recogida", "Te llega al instante"],
      ["Pregunta del cliente resuelta", "Con los datos de tu negocio"],
      ["Mensaje recogido para el equipo", "Te llega al instante"],
      ["Horario de atención confirmado", "Sin que tengas que llamar"],
    ],
    chip1: "Datos recogidos", chip2: "Te avisamos",
    chipT1: "Llamada atendida", chipT2: "Nueva solicitud de cita",
    c0: "Llamada entrante", c1: "La IA entiende", c2: "Acción ejecutada", cue: "Desliza",

    pTag: "Precios", pH: "Precios que crecen contigo.",
    pSub: "Todos los planes atienden 24/7 en español, inglés y francés. Elige el volumen de llamadas que necesitas.",
    tName: ["Básico", "Pro", "Premium"],
    tPin: "Recomendado", tMo: "/mes", tCalls: "llamadas al mes",
    tCta: ["Empezar", "Empezar", "Empezar"], soonGroup: "Próximo trimestre",
    tOver: "luego", tOverSuf: "por llamada extra",
    tInh: (n) => `Todo lo de ${n}, y además`, soon: "Pronto",
   feats: [
      [{ t: "Atiende 24/7" },
       { t: "Español, inglés y francés" },
       { t: "Responde preguntas sobre tu negocio" },
       { t: "Las solicitudes de reserva llegan a tu panel" },
       { t: "Varias llamadas atendidas a la vez" },
       { t: "Confirmación por SMS al cliente", soon: true }],
      [{ t: "Atiende 24/7" },
       { t: "Español, inglés y francés" },
       { t: "Responde preguntas sobre tu negocio" },
       { t: "Las solicitudes de reserva llegan a tu panel" },
       { t: "Varias llamadas atendidas a la vez" },
       { t: "Confirmación por SMS al cliente", soon: true }],
      [{ t: "Atiende 24/7" },
       { t: "Español, inglés y francés" },
       { t: "Responde preguntas sobre tu negocio" },
       { t: "Las solicitudes de reserva llegan a tu panel" },
       { t: "Varias llamadas atendidas a la vez" },
       { t: "Confirmación por SMS al cliente", soon: true }],
    ],
     
    cTag: "Contacto", cH: "Hablemos.",
    cSub: "Déjanos tus datos y te contactamos en menos de 24 horas.",
    fName: "Tu nombre", fBiz: "Negocio", fEmail: "Email", fPhone: "Teléfono",
    fMsg: "Mensaje",
    fMsgPh: "Cuéntanos un poco sobre tu negocio y cómo atiendes el teléfono hoy.",
    cSend: "Enviar mensaje", cSending: "Enviando…", cSent: "Enviado", cError: "No se pudo enviar, inténtalo de nuevo", cTrust: "Hecho en Europa",
    cTagline: "Llamadas más inteligentes. Clientes más contentos.",
  },
  FR: {
    navProduct: "Produit", navPricing: "Tarifs", navContact: "Contact",
    navLogin: "Espace client", navStart: "Commencer", langName: "Français",
    badge: "Réceptionniste IA · Multilingue",
    h1a: "Ne manquez plus", h1bPre: "un seul ", h1bWord: "client",
    lede: "LMC Agents répond à chaque appel, comprend ce dont l'appelant a besoin, agit en conséquence, puis vous informe de ce qui s'est passé. De jour comme de nuit.",
    heroCta: "Demander une démo", heroCta2: "Voir les tarifs",
    feat24: "Disponible 24/7", featLang: "Plusieurs langues", featCal: "Les demandes arrivent dans votre calendrier",
    consoleAria: "Un appel arrive, l'IA le comprend, et la bonne action est exécutée.",
    r0b: "Appel entrant", r0s: "··· ··· ··· 214",
    r1b: "Compréhension de la demande", r1s: "Intention, détails et contexte identifiés",
    outcomes: [
      ["Demande de rendez-vous enregistrée", "Envoyée instantanément"],
      ["Question de l'appelant résolue", "Avec les infos de votre entreprise"],
      ["Message pris pour l'équipe", "Envoyé instantanément"],
      ["Horaires confirmés à l'appelant", "Sans que vous ayez à rappeler"],
    ],
    chip1: "Détails recueillis", chip2: "Vous êtes prévenu",
    chipT1: "Appel traité", chipT2: "Nouvelle demande de rendez-vous",
    c0: "Appel entrant", c1: "L'IA comprend", c2: "Action exécutée", cue: "Défiler",

    pTag: "Tarifs", pH: "Des tarifs qui évoluent avec vous.",
    pSub: "Chaque formule répond 24/7 en français, anglais et espagnol. Choisissez le volume d'appels qui vous convient.",
    tName: ["Essentiel", "Pro", "Premium"],
    tPin: "Recommandé", tMo: "/mois", tCalls: "appels par mois",
    tCta: ["Commencer", "Commencer", "Commencer"], soonGroup: "Prochain trimestre",
    tOver: "puis", tOverSuf: "par appel supplémentaire",
    tInh: (n) => `Tout de ${n}, et en plus`, soon: "Bientôt",
    feats: [
      [{ t: "Répond 24/7" },
       { t: "Espagnol, anglais et français" },
       { t: "Répond aux questions sur votre entreprise" },
       { t: "Les demandes de réservation arrivent dans votre tableau de bord" },
       { t: "Plusieurs appels pris en même temps" },
       { t: "Confirmation par SMS envoyée au client", soon: true }],
      [{ t: "Répond 24/7" },
       { t: "Espagnol, anglais et français" },
       { t: "Répond aux questions sur votre entreprise" },
       { t: "Les demandes de réservation arrivent dans votre tableau de bord" },
       { t: "Plusieurs appels pris en même temps" },
       { t: "Confirmation par SMS envoyée au client", soon: true }],
      [{ t: "Répond 24/7" },
       { t: "Espagnol, anglais et français" },
       { t: "Répond aux questions sur votre entreprise" },
       { t: "Les demandes de réservation arrivent dans votre tableau de bord" },
       { t: "Plusieurs appels pris en même temps" },
       { t: "Confirmation par SMS envoyée au client", soon: true }],
    ],

    cTag: "Contact", cH: "Parlons-en.",
    cSub: "Laissez vos coordonnées, nous vous recontactons sous 24 heures.",
    fName: "Votre nom", fBiz: "Entreprise", fEmail: "Email", fPhone: "Téléphone",
    fMsg: "Message",
    fMsgPh: "Parlez-nous de votre activité et de la façon dont vous gérez le téléphone aujourd'hui.",
    cSend: "Envoyer le message", cSending: "Envoi…", cSent: "Envoyé", cError: "Échec de l'envoi, réessayez", cTrust: "Conçu en Europe",
    cTagline: "Des appels plus intelligents. Des clients plus satisfaits.",
  },
};

const Ck = () => (
  <span className="ck">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
  </span>
);
const Globe = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </svg>
);

type SendState = "idle" | "sending" | "sent" | "error";

// Landing sections in DOM order (ids), for the nav's active state.
const SECTIONS = ["product", "tour", "voice", "pricing", "types", "contact"];

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [lang, setLang] = useState<LangCode>("EN");
  const [menuList, setMenuList] = useState<LangCode[]>(ORDER);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [activeSec, setActiveSec] = useState("product");
  const [cueGone, setCueGone] = useState(false);
  const [sendState, setSendState] = useState<SendState>("idle");

  const t = T[lang];
  const langRefLive = useRef<LangCode>(lang);
  langRefLive.current = lang;
  const outIdx = useRef(0);

  /* the third beat rotates through different actions */
  const applyOutcome = () => {
    const d = T[langRefLive.current];
    const o = d.outcomes[outIdx.current % d.outcomes.length];
    const b = document.getElementById("outB");
    const s = document.getElementById("outS");
    if (b) b.textContent = o[0];
    if (s) s.textContent = o[1];
  };
  useEffect(applyOutcome, [lang]);

  // Close on outside click: test the event target against the wrapper directly,
  // rather than relying on stopPropagation ordering against React's event
  // delegation (that approach is timing-fragile — this one isn't).
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setNavOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); setNavOpen(false); }
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  useEffect(() => {
    // Scrolling is the browser's own: reloads and back/forward restore where
    // you were. The one correction: opening a link with a #section, the
    // browser jumps before the web fonts have loaded, and the page then
    // shifts under it -- so the same jump is repeated once they're in.
    try {
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const hashId = window.location.hash.slice(1);
      if (hashId && (!navEntry || navEntry.type === "navigate")) {
        document.fonts?.ready.then(() => {
          const el = document.getElementById(hashId);
          if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
        });
      }
    } catch { /* no Performance API: the browser's own jump stands */ }

    const onScroll = () => {
      const y = window.scrollY;
      setStuck(y > 24);
      setCueGone(y > 40);
      let here = "product";
      // DOM order: the last section whose top has passed 40% of the screen.
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) here = id;
      }
      // Dashboard and Voices belong to Product; Business types sits under
      // Pricing and has no nav button of its own.
      setActiveSec(here === "tour" || here === "voice" ? "product" : here === "types" ? "pricing" : here);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* reveal on enter */
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".up, .msk"));
    if (!els.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* language menu — selected first, then canonical order, animated with FLIP */
  function pickLang(code: LangCode) {
    setLang(code);
    document.cookie = `lmc_locale=${code.toLowerCase()};path=/;max-age=31536000`;
    const want: LangCode[] = [code, ...ORDER.filter((c) => c !== code)];
    const menu = menuRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!menu || reduce || want.join() === menuList.join()) {
      setMenuList(want);
      setMenuOpen(false);
      return;
    }

    const items = Array.from(menu.children) as HTMLElement[];
    const first = new Map(items.map((el) => [el.dataset.l as string, el.getBoundingClientRect().top]));
    setMenuList(want);

    requestAnimationFrame(() => {
      const now = Array.from(menu.children) as HTMLElement[];
      now.forEach((el) => {
        const prev = first.get(el.dataset.l as string);
        if (prev === undefined) return;
        const delta = prev - el.getBoundingClientRect().top;
        if (!delta) return;
        el.classList.remove("flip");
        el.style.transform = `translateY(${delta}px)`;
      });
      requestAnimationFrame(() => {
        now.forEach((el) => { el.classList.add("flip"); el.style.transform = ""; });
      });
      setTimeout(() => setMenuOpen(false), 470);
    });
  }

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
      const stageEl = q(".stage");
      // data-phase is the single hook the whole visualization's colour reads
      // from (console fill/rim, orbit rings, glow -- see globals.css). One
      // attribute, set alongside the existing progress dots, instead of
      // colouring each element from its own tween.
      const setCap = (n: number) => {
        cap.forEach((c, k) => c.classList.toggle("on", k === n));
        stageEl?.setAttribute("data-phase", String(n));
      };

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
      const tl = gsap.timeline({
        repeat: -1,
        defaults: { ease: "power3.out" },
        onRepeat: () => { outIdx.current++; applyOutcome(); },
      });

      fills.forEach((f, i) => {
        tl.to(f, { scaleX: 1, duration: BEAT, ease: "none" }, i * BEAT);
      });

      /* The outer orbit fills in, one third per stage. A light starts at the
         top centre, travels round with each stage, and on the last one comes
         back to where it started: the orbit closes and lights up as a neon
         ring, then fades before the loop restarts. The arc and the light
         share each step's timing and ease, so the light always sits on the
         arc's leading end. (The arc is drawn as an SVG attribute: GSAP rounds
         a CSS stroke-dashoffset to whole px, which on a path of length 1
         would snap it from hidden to drawn.) */
      const STEP = [
        { from: 0, to: 1 / 3, at: 0.15, dur: BEAT - 0.45 },
        { from: 1 / 3, to: 2 / 3, at: BEAT + 0.05, dur: BEAT - 0.35 },
        { from: 2 / 3, to: 1, at: BEAT * 2 + 0.05, dur: 0.85 },
      ];
      tl.set(".orbit-progress", { opacity: 1 }, 0)
        .set(".op-arc", { attr: { "stroke-dashoffset": 1 } }, 0)
        .set(".op-head", { rotation: 0, svgOrigin: "50 50", opacity: 1 }, 0)
        .set(".op-neon", { opacity: 0 }, 0);
      STEP.forEach((st) => {
        tl.fromTo(".op-arc", { attr: { "stroke-dashoffset": 1 - st.from } }, { attr: { "stroke-dashoffset": 1 - st.to }, duration: st.dur, ease: "power2.inOut", immediateRender: false }, st.at)
          .fromTo(".op-head", { rotation: 360 * st.from, svgOrigin: "50 50" }, { rotation: 360 * st.to, svgOrigin: "50 50", duration: st.dur, ease: "power2.inOut", immediateRender: false }, st.at);
      });
      const CLOSED = BEAT * 2 + 0.9;
      tl.to(".op-head", { opacity: 0, duration: 0.3 }, CLOSED - 0.05)
        // the ring closes: a flash of neon that settles into a steady glow
        .fromTo(".op-neon", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, CLOSED - 0.1)
        .to(".op-neon", { opacity: 0.55, duration: 0.9, ease: "sine.inOut" }, CLOSED + 0.3)
        .to(".orbit-progress", { opacity: 0, duration: 0.45, ease: "power2.in" }, BEAT * 3 - 0.5)

      /* the orbit answers each stage: a warm pulse while the phone rings,
         a quicker, softer pulse while the AI works, one settle at the end */
        .fromTo(".or-pulse", { scale: 1, svgOrigin: "380 260" }, { scale: 1.018, svgOrigin: "380 260", duration: 0.55, ease: "sine.inOut", yoyo: true, repeat: 3 }, 0.1)
        .to(".or-pulse", { opacity: 0.6, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 3 }, BEAT + 0.1)
        .fromTo(".or-pulse", { scale: 1.012, svgOrigin: "380 260" }, { scale: 1, svgOrigin: "380 260", duration: 0.9, ease: "power2.out" }, BEAT * 2 + 0.3);

      // a slow sway, independent of the stages
      gsap.to(".or-drift", { rotation: 2.5, svgOrigin: "380 260", duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });

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
        // the AI mark takes the phone's place in the core while it "thinks",
        // breathing once, and hands over to the checkmark
        .fromTo("#icAi", { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, duration: 0.6 }, BEAT + 0.12)
        .to("#icAi", { scale: 1.07, duration: 0.8, ease: "sine.inOut", yoyo: true, repeat: 1 }, BEAT + 0.9)
        .to(bars, { scaleY: () => 0.3 + Math.random() * 0.95, duration: 0.46, ease: "sine.inOut", repeat: 3, yoyo: true, stagger: { each: 0.007, from: "random" } }, BEAT + 0.68)

        /* BEAT 3 — automation completed */
        .add(() => setCap(2), BEAT * 2)
        .to(".a-jade", { opacity: 0, duration: OUT, ease: "power2.inOut" }, BEAT * 2 - 0.1)
        .to(".a-bright", { opacity: 1, duration: 0.7, ease: "power2.out" }, BEAT * 2 - 0.1)
        .to(bars, { scaleY: 0.16, duration: 0.5, ease: "power3.inOut", stagger: { each: 0.006, from: "edges" } }, BEAT * 2 - 0.12)
        .to(".radial", { opacity: 0, duration: 0.42 }, BEAT * 2 + 0.16)
        .to("#icAi", { opacity: 0, scale: 0.72, duration: 0.38, ease: "power2.in" }, BEAT * 2 - 0.12)
        .to('.line[data-i="1"]', { opacity: 0, y: -12, duration: 0.42, ease: "power2.in" }, BEAT * 2 - 0.12)
        .fromTo("#icCheck", { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2.6)" }, BEAT * 2 + 0.22)
        .fromTo("#icCheck path", { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, BEAT * 2 + 0.34)
        // A small "done" burst, timed to the checkmark landing: two quick
        // jade ripples (smaller/faster than the incoming-call ones) and
        // three tiny particles drifting out and fading. Restrained on
        // purpose -- a confirmation, not a celebration.
        .fromTo("#rip3", { opacity: 0, scale: 0.6 }, { opacity: 0.6, scale: 0.85, duration: 0.14, ease: "none" }, BEAT * 2 + 0.3)
        .to("#rip3", { opacity: 0, scale: 1.7, duration: 0.8, ease: "sine.out" }, BEAT * 2 + 0.44)
        .fromTo("#rip4", { opacity: 0, scale: 0.6 }, { opacity: 0.5, scale: 0.85, duration: 0.14, ease: "none" }, BEAT * 2 + 0.46)
        .to("#rip4", { opacity: 0, scale: 1.7, duration: 0.8, ease: "sine.out" }, BEAT * 2 + 0.6)
        .fromTo(
          ".spark",
          { opacity: 0, scale: 0.4, x: 0, y: 0 },
          {
            opacity: 1, scale: 1, duration: 0.35, ease: "power2.out", stagger: 0.06,
            x: (i: number) => [16, -18, 4][i], y: (i: number) => [-20, -10, 18][i],
          },
          BEAT * 2 + 0.3,
        )
        .to(".spark", { opacity: 0, duration: 0.5, ease: "power2.in", stagger: 0.06 }, BEAT * 2 + 0.62)
        .fromTo('.line[data-i="2"]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.65 }, BEAT * 2 + 0.42)
        // chip-1 (left, "Call answered") pops in first; chip-2 (right, "New
        // booking request") follows about half a second later. Each still
        // slides in from its own outer edge -- left card from further left,
        // right card from further right.
        .fromTo(".chip-1", { opacity: 0, y: 20, x: -14, scale: 0.93 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.75 }, BEAT * 2 + 0.56)
        .fromTo(".chip-2", { opacity: 0, y: 20, x: 14, scale: 0.93 }, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.75 }, BEAT * 2 + 1.06)

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
      gsap.from("h1 .l>span", { yPercent: 105, duration: 1.05, stagger: 0.085, delay: 0.1, ease: "power4.out" });
      gsap.from(".lede", { opacity: 0, y: 14, duration: 0.85, delay: 0.34 });
      // Wrappers, not the button: .btn-primary has a CSS transition on
      // transform, which fights GSAP's inline transform and leaves it stuck.
      gsap.from(".cta", { opacity: 0, y: 14, duration: 0.8, delay: 0.46 });
      gsap.from(".hero-feats li", { opacity: 0, y: 12, duration: 0.7, delay: 0.6, stagger: 0.09 });
      gsap.from(".stage", { opacity: 0, y: 28, scale: 0.97, duration: 1.15, delay: 0.2, ease: "power3.out" });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sendState !== "idle") return;
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setSendState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "signup", lang, ...payload }),
      });
      if (!res.ok) throw new Error(`contact route responded ${res.status}`);
      setSendState("sent");
      form.reset();
      setTimeout(() => setSendState("idle"), 4200);
    } catch (err) {
      // Do NOT reset the form here — the visitor's input must survive a
      // failed send so they can just hit Send again instead of retyping.
      console.error("[contact] submit failed", err);
      setSendState("error");
      setTimeout(() => setSendState("idle"), 4200);
    }
  }

  return (
    <>
      <nav className={stuck ? "stuck" : undefined}>
        <div className="wrap nav-grid">
            <a href="#product" className="logo" aria-label="LMC Agents home">
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
              <a href="#product" className={activeSec === "product" ? "active" : undefined}>{t.navProduct}</a>
              <a href="#pricing" className={activeSec === "pricing" ? "active" : undefined}>{t.navPricing}</a>
              <a href="#contact" className={activeSec === "contact" ? "active" : undefined}>{t.navContact}</a>
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
                <div
                  ref={menuRef}
                  className={`lang-menu${menuOpen ? " open" : ""}`}
                  role="listbox"
                  aria-label="Language"
                >
                  {menuList.map((c) => (
                    <button
                      key={c}
                      data-l={c}
                      role="option"
                      aria-selected={lang === c}
                      onClick={() => pickLang(c)}
                    >
                      <span className="code">{c}</span>
                      {T[c].langName}
                      <svg className="mark" viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                    </button>
                  ))}
                </div>
              </div>

              <a className="btn-login" href="/login">
                {t.navLogin}
                <svg className="ar" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>

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
                  <a href="/login" onClick={() => setNavOpen(false)}>{t.navLogin}</a>
                </div>
              </div>
            </div>
          </div>
      </nav>

      <div ref={rootRef} className="app-shell" id="product">
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

        {/* ===== HERO — restored inside <main>, which the CSS depends on
             (main .wrap.hero caps it at 1280px instead of the site-wide 1680px) ===== */}
        <main>
        <div className="wrap hero">
          <div className="copy">
            <h1>
              <span className="l"><span>{t.h1a}</span></span>
              <span className="l"><span>{t.h1bPre}<span className="grad">{t.h1bWord}</span>.</span></span>
            </h1>

            <p className="lede">{t.lede}</p>

            {/* One primary button. (No "Watch demo": there is no demo to
                watch.) t.heroCta / t.heroCta2 stay defined, unused. */}
            <div className="cta">
              <a className="btn-primary" href="#contact">
                {t.navStart}
                <svg className="ar" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          </div>

          <div className="stage">
            <div className="aura" aria-hidden="true">
              <div className="a-warm" />
              <div className="a-jade" />
              <div className="a-bright" />
            </div>

            {/* Two thin rings hugging the sphere -- a hint of orbit, not a
                display in its own right. Drawn before the console in the DOM
                so its opaque circle covers the inner portion; only the arcs
                that clear the sphere's edge are ever visible. No dots, no
                ring reaching out toward the copy: restrained on purpose.
                Their colour is driven by the same --ph-ring* custom
                properties the console reads (see globals.css), so they shift
                amber/jade/bright-jade together with the rest of the sphere. */}
            <svg className="orbit-lines" viewBox="0 0 760 520" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="orA" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="var(--ph-ring-a)" stopOpacity="0" />
                  <stop offset=".3" stopColor="var(--ph-ring-a)" stopOpacity=".55" />
                  <stop offset=".7" stopColor="var(--ph-ring-b)" stopOpacity=".4" />
                  <stop offset="1" stopColor="var(--ph-ring-a)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* or-drift: a slow sway; or-pulse: the stage pulses (GSAP) */}
              <g className="or-drift"><g className="or-pulse">
                <g transform="rotate(-13 380 260)">
                  <ellipse cx="380" cy="260" rx="256" ry="88" stroke="url(#orA)" strokeWidth="1" />
                </g>
                <g transform="rotate(15 380 260)">
                  <ellipse cx="380" cy="260" rx="266" ry="108" stroke="var(--ph-ring2)" strokeWidth=".8" strokeDasharray="2 8" className="or-dash" />
                </g>
              </g></g>
            </svg>

            <div
              className="console glass"
              id="console"
              role="img"
              aria-label={t.consoleAria}
            >
              {/* Fine dot texture concentrated towards the rim: the "technological
                  object" surface. Pure decoration, restrained (low opacity,
                  masked out towards the centre so it never competes with the
                  readout). */}
              <div className="console-dots" aria-hidden="true" />
              {/* The outer orbit, drawn as the animation runs: a line of light
                  that starts at the top centre, goes a third of the way round
                  per stage, and closes the circle on the last one -- the ring
                  then glows (op-neon). Coloured by the stage, like the rest. */}
              <svg className="orbit-progress" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="op-neon" cx="50" cy="50" r="48" />
                <circle className="op-arc" cx="50" cy="50" r="48" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} transform="rotate(-90 50 50)" />
                <g className="op-head">
                  <circle className="op-halo" cx="50" cy="2" r="2.4" />
                  <circle className="op-dot" cx="50" cy="2" r=".7" />
                </g>
              </svg>
              <div className="console-in">
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
                  {/* AI understands: a brain drawn as two hemispheres with a
                      few circuit traces -- a technical mark, not a cartoon */}
                  <svg className="icon-ai" id="icAi" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4.8C11.2 4.1 9.9 3.9 8.9 4.4C7.8 4.1 6.6 4.8 6.3 5.9C5 6.2 4.2 7.5 4.5 8.8C3.6 9.6 3.4 11 4.1 12C3.5 13.1 3.8 14.6 4.9 15.3C4.9 16.7 6.1 17.8 7.5 17.7C8.1 18.9 9.6 19.5 10.9 18.9C11.4 19.3 12 19.3 12 19.3" />
                    <path d="M12 4.8C12.8 4.1 14.1 3.9 15.1 4.4C16.2 4.1 17.4 4.8 17.7 5.9C19 6.2 19.8 7.5 19.5 8.8C20.4 9.6 20.6 11 19.9 12C20.5 13.1 20.2 14.6 19.1 15.3C19.1 16.7 17.9 17.8 16.5 17.7C15.9 18.9 14.4 19.5 13.1 18.9C12.6 19.3 12 19.3 12 19.3" />
                    <path d="M12 4.8V19.3M12 8.6H9.6M12 12.4H10.4L9 13.8M12 10.4h2.4M12 14.8h1.6l1.2 1.2" />
                    <circle cx="8.6" cy="8.6" r="1" /><circle cx="8.3" cy="14.5" r="1" />
                    <circle cx="15.4" cy="10.4" r="1" /><circle cx="15.5" cy="16.7" r="1" />
                  </svg>
                  <svg className="icon-check" id="icCheck" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5.5 12.4 10 17l8.5-9" />
                  </svg>
                </div>
                {/* A small, restrained "done" burst around the checkmark: two
                    quick jade ripples and three tiny particles, all inert
                    until the action-taken beat animates them. Not a GSAP
                    target list the user asked to preserve, so free to add. */}
                <div className="ripple success" id="rip3" />
                <div className="ripple success" id="rip4" />
                <span className="spark" id="spark1" />
                <span className="spark" id="spark2" />
                <span className="spark" id="spark3" />
              </div>

              <div className="readout">
                <div className="line" data-i="0"><b>{t.r0b}</b><span>{t.r0s}</span></div>
                <div className="line" data-i="1"><b>{t.r1b}</b><span>{t.r1s}</span></div>
                <div className="line" data-i="2"><b id="outB">{t.outcomes[0][0]}</b><span className="ok" id="outS">{t.outcomes[0][1]}</span></div>
              </div>

              <div className="prog"><i /><i /><i /></div>
              </div>
            </div>

            <div className="chips" aria-hidden="true">
              <div className="chip chip-1">
                <span className="chip-float">
                <span className="ci-ic"><svg viewBox="0 0 24 24"><path d="M6.6 3.8h3.1l1.5 4-2 1.5a11.2 11.2 0 0 0 5.5 5.5l1.5-2 4 1.5v3.1a2 2 0 0 1-2.2 2A15.6 15.6 0 0 1 4.6 6a2 2 0 0 1 2-2.2Z" /></svg></span>
                <span className="ci-tx">
                  <b>{t.chipT1}</b>
                  <em><svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg>{t.chip1}</em>
                </span>
                </span>
              </div>
              <div className="chip chip-2">
                <span className="chip-float chip-float-2">
                <span className="ci-ic"><svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></svg></span>
                <span className="ci-tx">
                  <b>{t.chipT2}</b>
                  <em><svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg>{t.chip2}</em>
                </span>
                </span>
              </div>
            </div>

            <div className="caption">
              <b data-c="0">{t.c0}</b><em />
              <b data-c="1">{t.c1}</b><em />
              <b data-c="2">{t.c2}</b>
            </div>
          </div>

          {/* What the product does, in one row under the hero. Full width:
              it's the last row of the hero grid. */}
          <ul className="hero-feats">
            <li>
              <span className="fi"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg></span>
              {t.feat24}
            </li>
            <li>
              <span className="fi"><Globe /></span>
              {t.featLang}
            </li>
            <li>
              <span className="fi"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></svg></span>
              {t.featCal}
            </li>
          </ul>
        </div>

        </main>

        <div className={`cue${cueGone ? " gone" : ""}`} aria-hidden="true">
          <span className="cue-t">{t.cue}</span>
          <span className="cue-r" />
        </div>
      </div>
      {/* ===== end app-shell ===== */}

      {/* Product: the dashboard tour and voice samples. Each shows a
          "coming soon" state until its TOUR_SCREENSHOTS_READY /
          VOICE_SAMPLES_READY flag is flipped (inside the component). */}
      <ProductTour lang={lang} />
      <VoiceSamples lang={lang} />

      <section className="sec" id="pricing">
        <div className="wrap">
          <div className="sec-head mid">
            <p className="eyebrow">{t.pTag}</p>
            <h2 className="sec-h"><span className="msk"><span>{t.pH}</span></span></h2>
            <p className="sec-sub up d1">{t.pSub}</p>
          </div>

          <div className="tiers">
            {TIERS.map((x, i) => (
              <div key={i} className={`tier up d${i + 1}`}>
                <div className="tier-top">
                  <span className="tier-name">{t.tName[i]}</span>
                </div>
                <div className="tier-fig">
                  <b>{x.price}<span className="tier-cur">€</span></b><span>{t.tMo}</span>
                </div>
                <div className="tier-vol"><b>{x.calls}</b><span>{t.tCalls}</span></div>
                <div className="tier-over">{t.tOver} {x.over} {t.tOverSuf}</div>
                <div className="tier-rule" />
                <ul className="tier-f">
                  {t.feats[i].filter((f) => !f.soon).map((f) => (
                    <li key={f.t}><Ck /><span>{f.t}</span></li>
                  ))}
                  {SHOW_SOON && t.feats[i].some((f) => f.soon) && (
                    <li className="soon-head" aria-hidden="true">
                      {t.soonGroup}<span className="soon-pill">{t.soon}</span>
                    </li>
                  )}
                  {SHOW_SOON && t.feats[i].filter((f) => f.soon).map((f) => (
                    <li key={f.t} className="is-soon"><Ck /><span>{f.t}</span></li>
                  ))}
                </ul>
                {/* At the bottom of every card, so the three buttons line up
                    whatever the length of the list above. */}
                <a className="tier-cta" href="#contact">
                  {t.tCta[i]}
                  <svg className="ar" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Businesses we support: under Pricing, no nav button of its own. */}
      <BusinessTypes lang={lang} />

      <section className="sec contact" id="contact">
        <div className="wrap">
          {/* The closing section, on one centre axis: heading, one line, the
              form, then the footer. */}
          <div className="sec-head mid">
            <p className="eyebrow">{t.cTag}</p>
            <h2 className="sec-h"><span className="msk"><span>{t.cH}</span></span></h2>
            <p className="sec-sub up d1">{t.cSub}</p>
          </div>

          <div className="cta-card up d2">
            <form onSubmit={submit}>
              <div className="fld-2">
                <div className="fld">
                  <label htmlFor="f-name">{t.fName}</label>
                  <input id="f-name" name="name" type="text" required autoComplete="name" />
                </div>
                <div className="fld">
                  <label htmlFor="f-biz">{t.fBiz}</label>
                  <input id="f-biz" name="business" type="text" required autoComplete="organization" />
                </div>
              </div>
              <div className="fld-2">
                <div className="fld">
                  <label htmlFor="f-email">{t.fEmail}</label>
                  <input id="f-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="fld">
                  <label htmlFor="f-phone">{t.fPhone}</label>
                  <input id="f-phone" name="phone" type="tel" required autoComplete="tel" />
                </div>
              </div>
              <div className="fld">
                <label htmlFor="f-msg">{t.fMsg}</label>
                <textarea id="f-msg" name="message" placeholder={t.fMsgPh} />
              </div>
              <button
                className={`send${sendState === "sent" ? " ok" : ""}${sendState === "sending" ? " busy" : ""}${sendState === "error" ? " err" : ""}`}
                type="submit"
                disabled={sendState === "sending"}
              >
                <span className="spin" aria-hidden="true" />
                <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12.5 9.5 18 20 6.5" />
                </svg>
                <span>
                  {sendState === "sending" ? t.cSending
                    : sendState === "sent" ? t.cSent
                    : sendState === "error" ? t.cError
                    : t.cSend}
                </span>
              </button>
            </form>
          </div>

          <footer className="page-foot">
            <span>© 2026 LMC Agents</span>
            <span className="foot-dot" />
            <span className="foot-eu"><Globe />{t.cTrust}</span>
          </footer>
        </div>
      </section>

    </>
  );
}
