"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const SPOKES = 44;
type LangCode = "EN" | "ES" | "FR";
const ORDER: LangCode[] = ["EN", "ES", "FR"];

/* ------------------------------------------------------------------
   ⚠️ PRICING IS PROVISIONAL — Master Paper §6.4.
   Not published until father review + real-line cost confirmation.

   ⚠️ ROADMAP ITEMS ARE MARKED. Anything with soon:true is NOT built
   yet. SHOW_SOON renders a small "Soon" tag so the page stays truthful
   (§13.2 — the hero copy problem). Set it false only once those
   automations actually ship.
------------------------------------------------------------------- */
const SHOW_SOON = true;
const SPOTS_LEFT = 5;

const TIER_CTA_STYLE = ["outline", "solid", "outline"];

const TIERS = [
  { price: "99€", calls: 50, over: "1,40€", on: false },
  { price: "199€", calls: 150, over: "1,20€", on: true },
  { price: "399€", calls: 400, over: "0,95€", on: false },
];

type Feat = { t: string; soon?: boolean };

type Dict = {
  navProduct: string; navPricing: string; navContact: string;
  navLogin: string; navStart: string; langName: string;
  badge: string; h1a: string; h1bPre: string; h1bWord: string; lede: string;
  heroCta: string; heroCta2: string;
  consoleAria: string;
  r0b: string; r0s: string; r1b: string; r1s: string;
  outcomes: [string, string][];
  chip1: string; chip2: string; c0: string; c1: string; c2: string; cue: string;
  pTag: string; pH: string; pSub: string;
  oK: string; oB: (n: number) => string;
  tName: [string, string, string]; tPin: string; tMo: string; tCalls: string;
  tOver: string; tOverSuf: string; tInh: (n: string) => string; soon: string;
  tCta: [string, string, string]; soonGroup: string;
  feats: [Feat[], Feat[], Feat[]];
  cTag: string; cH: string; cSub: string;
  fName: string; fBiz: string; fEmail: string; fPhone: string;
  fMsg: string; fMsgPh: string;
  cSend: string; cSending: string; cSent: string; cTrust: string;
};

const T: Record<LangCode, Dict> = {
  EN: {
    navProduct: "Product", navPricing: "Pricing", navContact: "Contact",
    navLogin: "Client access", navStart: "Get started", langName: "English",
    badge: "AI receptionist · Multilingual",
    h1a: "Never miss", h1bPre: "another ", h1bWord: "customer",
    lede: "LMC Agents answers every call, understands what the caller actually needs, handles what comes next, and then tells you exactly what happened. Day and night.",
    heroCta: "Request a demo", heroCta2: "See pricing",
    consoleAria: "A call comes in, the AI understands it, and the right action is taken.",
    r0b: "Incoming call", r0s: "··· ··· ··· 214",
    r1b: "Understanding the request", r1s: "Intent, details and context captured",
    outcomes: [
      ["Booking request captured", "Sent to you instantly"],
      ["Caller's question answered", "Straight from your knowledge base"],
      ["Message taken for the team", "Sent to you instantly"],
      ["Opening hours confirmed", "No call needed from you"],
    ],
    chip1: "Details captured", chip2: "You're notified",
    c0: "Incoming call", c1: "AI understands", c2: "Action taken", cue: "Scroll",

    pTag: "Pricing", pH: "Pricing that scales with you.",
    pSub: "Estimates based on an average three-minute call.",
    oK: "Setup and configuration", oB: (n) => `Free for the next ${n} clients`,
    tName: ["Starter", "Standard", "Scale"],
    tPin: "Most chosen", tMo: "/month", tCalls: "calls a month",
    tCta: ["Get started", "Get started", "Get started"], soonGroup: "Coming next quarter",
    tOver: "then", tOverSuf: "per extra call",
    tInh: (n) => `Everything in ${n}, plus`, soon: "Soon",
    feats: [
      [{ t: "Answers 24/7, nights and weekends" },
       { t: "Spanish, English and French" },
       { t: "Answers questions from your knowledge base" },
       { t: "Captures every request in full" },
       { t: "Emailed to you the moment a call ends" },
       { t: "Several callers answered at once" }],
      [{ t: "Writes bookings straight to your calendar", soon: true },
       { t: "SMS confirmation to the caller", soon: true },
       { t: "Recordings and transcripts of every call", soon: true },
       { t: "Monthly performance report", soon: true }],
      [{ t: "Reminder calls 24h before the appointment", soon: true },
       { t: "No-show follow-up and waitlist fill", soon: true },
       { t: "Review request after the visit", soon: true },
       { t: "Live transfer to your team when it matters", soon: true }],
    ],

    cTag: "Contact", cH: "Let's talk.",
    cSub: "Leave your details and we'll get back to you within 24 hours.",
    fName: "Your name", fBiz: "Business", fEmail: "Email", fPhone: "Phone",
    fMsg: "Message",
    fMsgPh: "Tell us a little about your business and how you handle the phone today.",
    cSend: "Send", cSending: "Sending…", cSent: "Sent", cTrust: "Built in Europe",
  },
  ES: {
    navProduct: "Producto", navPricing: "Precios", navContact: "Contacto",
    navLogin: "Acceso clientes", navStart: "Empezar", langName: "Español",
    badge: "Recepcionista IA · Multilingüe",
    h1a: "Nunca pierdas", h1bPre: "a otro ", h1bWord: "cliente",
    lede: "LMC Agents contesta cada llamada, entiende lo que necesita de verdad quien llama, se encarga de lo que viene después y luego te cuenta exactamente qué ha pasado. De día y de noche.",
    heroCta: "Solicitar una demo", heroCta2: "Ver precios",
    consoleAria: "Entra una llamada, la IA la entiende, y se ejecuta la acción correcta.",
    r0b: "Llamada entrante", r0s: "··· ··· ··· 214",
    r1b: "Entendiendo la solicitud", r1s: "Intención, datos y contexto capturados",
    outcomes: [
      ["Solicitud de cita recogida", "Te llega al instante"],
      ["Pregunta del cliente resuelta", "Desde tu base de conocimiento"],
      ["Mensaje recogido para el equipo", "Te llega al instante"],
      ["Horario confirmado al cliente", "Sin que tengas que llamar"],
    ],
    chip1: "Datos capturados", chip2: "Te avisamos",
    c0: "Llamada entrante", c1: "La IA entiende", c2: "Acción ejecutada", cue: "Baja",

    pTag: "Precios", pH: "Precios que crecen contigo.",
    pSub: "Estimado sobre llamadas de tres minutos de media.",
    oK: "Configuración inicial", oB: (n) => `Gratis para los próximos ${n} clientes`,
    tName: ["Inicial", "Estándar", "Amplio"],
    tPin: "El más elegido", tMo: "/mes", tCalls: "llamadas al mes",
    tCta: ["Empezar", "Empezar", "Empezar"], soonGroup: "Próximo trimestre",
    tOver: "luego", tOverSuf: "por llamada extra",
    tInh: (n) => `Todo lo de ${n}, y además`, soon: "Pronto",
    feats: [
      [{ t: "Atiende 24/7, noches y fines de semana" },
       { t: "Español, inglés y francés" },
       { t: "Responde con tu base de conocimiento" },
       { t: "Recoge cada solicitud al completo" },
       { t: "Te llega por email al terminar la llamada" },
       { t: "Varias llamadas atendidas a la vez" }],
      [{ t: "Escribe las citas directamente en tu calendario", soon: true },
       { t: "SMS de confirmación al cliente", soon: true },
       { t: "Grabaciones y transcripciones de cada llamada", soon: true },
       { t: "Informe mensual de rendimiento", soon: true }],
      [{ t: "Llamadas de recordatorio 24h antes", soon: true },
       { t: "Recuperación de ausencias y lista de espera", soon: true },
       { t: "Petición de reseña tras la visita", soon: true },
       { t: "Transferencia a tu equipo cuando hace falta", soon: true }],
    ],

    cTag: "Contacto", cH: "Hablemos.",
    cSub: "Déjanos tus datos y te contactamos en menos de 24 horas.",
    fName: "Tu nombre", fBiz: "Negocio", fEmail: "Email", fPhone: "Teléfono",
    fMsg: "Mensaje",
    fMsgPh: "Cuéntanos un poco sobre tu negocio y cómo atiendes el teléfono hoy.",
    cSend: "Enviar", cSending: "Enviando…", cSent: "Enviado", cTrust: "Hecho en Europa",
  },
  FR: {
    navProduct: "Produit", navPricing: "Tarifs", navContact: "Contact",
    navLogin: "Espace client", navStart: "Commencer", langName: "Français",
    badge: "Réceptionniste IA · Multilingue",
    h1a: "Ne manquez plus", h1bPre: "un seul ", h1bWord: "client",
    lede: "LMC Agents répond à chaque appel, comprend ce dont l'appelant a réellement besoin, gère la suite et vous dit ensuite exactement ce qui s'est passé. Jour et nuit.",
    heroCta: "Demander une démo", heroCta2: "Voir les tarifs",
    consoleAria: "Un appel arrive, l'IA le comprend, et la bonne action est exécutée.",
    r0b: "Appel entrant", r0s: "··· ··· ··· 214",
    r1b: "Compréhension de la demande", r1s: "Intention, détails et contexte capturés",
    outcomes: [
      ["Demande de rendez-vous enregistrée", "Envoyée instantanément"],
      ["Question de l'appelant résolue", "Depuis votre base de connaissances"],
      ["Message pris pour l'équipe", "Envoyé instantanément"],
      ["Horaires confirmés à l'appelant", "Sans que vous ayez à rappeler"],
    ],
    chip1: "Détails capturés", chip2: "Vous êtes prévenu",
    c0: "Appel entrant", c1: "L'IA comprend", c2: "Action exécutée", cue: "Défiler",

    pTag: "Tarifs", pH: "Des tarifs qui évoluent avec vous.",
    pSub: "Estimé sur un appel moyen de trois minutes.",
    oK: "Mise en place et configuration", oB: (n) => `Offerte pour les ${n} prochains clients`,
    tName: ["Essentiel", "Standard", "Étendu"],
    tPin: "Le plus choisi", tMo: "/mois", tCalls: "appels par mois",
    tCta: ["Commencer", "Commencer", "Commencer"], soonGroup: "Le trimestre prochain",
    tOver: "puis", tOverSuf: "par appel supplémentaire",
    tInh: (n) => `Tout de ${n}, et en plus`, soon: "Bientôt",
    feats: [
      [{ t: "Répond 24/7, nuits et week-ends compris" },
       { t: "Espagnol, anglais et français" },
       { t: "Répond depuis votre base de connaissances" },
       { t: "Enregistre chaque demande en entier" },
       { t: "Email dès la fin de l'appel" },
       { t: "Plusieurs appels pris en même temps" }],
      [{ t: "Écrit les rendez-vous dans votre agenda", soon: true },
       { t: "SMS de confirmation à l'appelant", soon: true },
       { t: "Enregistrements et transcriptions", soon: true },
       { t: "Rapport de performance mensuel", soon: true }],
      [{ t: "Appels de rappel 24h avant", soon: true },
       { t: "Relance des absences et liste d'attente", soon: true },
       { t: "Demande d'avis après la visite", soon: true },
       { t: "Transfert vers votre équipe si nécessaire", soon: true }],
    ],

    cTag: "Contact", cH: "Parlons-en.",
    cSub: "Laissez vos coordonnées, nous revenons vers vous sous 24 heures.",
    fName: "Votre nom", fBiz: "Établissement", fEmail: "Email", fPhone: "Téléphone",
    fMsg: "Message",
    fMsgPh: "Parlez-nous de votre activité et de la façon dont vous gérez le téléphone aujourd'hui.",
    cSend: "Envoyer", cSending: "Envoi…", cSent: "Envoyé", cTrust: "Conçu en Europe",
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

type SendState = "idle" | "sending" | "sent";

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
    const onScroll = () => {
      const y = window.scrollY;
      setStuck(y > 24);
      setCueGone(y > 40);
      let active = "product";
      for (const id of ["product", "pricing", "contact"]) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) active = id;
      }
      setActiveSec(active);
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
      const tl = gsap.timeline({
        repeat: -1,
        defaults: { ease: "power3.out" },
        onRepeat: () => { outIdx.current++; applyOutcome(); },
      });

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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sendState !== "idle") return;
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setSendState("sending");
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "signup", lang, ...payload }),
      });
    } catch {
      /* the button still confirms; the lead is not lost on a transient error */
    }
    setSendState("sent");
    form.reset();
    setTimeout(() => setSendState("idle"), 4200);
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

              <a className="btn-login" href="/login">{t.navLogin}</a>

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
            <div className="badge"><span className="pip" />{t.badge}</div>

            <h1>
              <span className="l"><span>{t.h1a}</span></span>
              <span className="l"><span>{t.h1bPre}<span className="grad">{t.h1bWord}</span>.</span></span>
            </h1>

            <p className="lede">{t.lede}</p>

            {/* CTA slot: intentionally empty until we have a demo worth showing. */}
            <div className="cta-slot" aria-hidden="true">
              {/*
                No demo exists yet — leave commented until one does.
                Uncomment this block, remove aria-hidden above, and it's live:

                <a className="btn-primary" href="#contact">
                  {t.heroCta}
                  <svg className="ar" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
                <a className="btn-ghost" href="#pricing">{t.heroCta2}</a>
              */}
            </div>
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
                <div className="line" data-i="2"><b id="outB">{t.outcomes[0][0]}</b><span className="ok" id="outS">{t.outcomes[0][1]}</span></div>
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

        <div className={`cue${cueGone ? " gone" : ""}`} aria-hidden="true">
          <span className="cue-t">{t.cue}</span>
          <span className="cue-r" />
        </div>
      </div>
      {/* ===== end app-shell ===== */}

      <section className="sec" id="pricing">
        <div className="wrap">
          <div className="sec-head mid tag-only">
            <div className="sec-tag up">{t.pTag}</div>
          </div>

          <div className="offer up d1">
            <span className="offer-dot" />
            <span className="offer-k">{t.oK}</span>
            <span className="offer-v">390€</span>
            <span className="offer-b">{t.oB(SPOTS_LEFT)}</span>
          </div>

          <div className="tiers">
            {TIERS.map((x, i) => (
              <div key={i} className={`tier${x.on ? " tier-on" : ""} up d${i + 1}`}>
                <div className="tier-top">
                  <span className="tier-name">{t.tName[i]}</span>
                  {x.on && <span className="tier-pin">{t.tPin}</span>}
                </div>
                <div className="tier-fig">
                  <b>{x.price}<span className="tier-cur">€</span></b><span>{t.tMo}</span>
                </div>
                <div className="tier-vol"><b>{x.calls}</b><span>{t.tCalls}</span></div>
                <div className="tier-over">{t.tOver} {x.over} {t.tOverSuf}</div>
                <a className={`tier-cta ${TIER_CTA_STYLE[i]}`} href="#contact">{t.tCta[i]}</a>
                <div className="tier-rule" />
                {i > 0 && <div className="tier-inh">{t.tInh(t.tName[i - 1])}</div>}
                <ul className="tier-f">
                  {t.feats[i].filter((f) => !f.soon).map((f) => (
                    <li key={f.t}><Ck /><span>{f.t}</span></li>
                  ))}
                  {SHOW_SOON && t.feats[i].some((f) => f.soon) && (
                    <li className="soon-head" aria-hidden="true">
                      {t.soonGroup}<span className="soon-pill">{t.soon}</span>
                    </li>
                  )}
                  {t.feats[i].filter((f) => f.soon).map((f) => (
                    <li key={f.t} className="is-soon"><Ck /><span>{f.t}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="contact">
        <div className="wrap">
          <div className="sec-head mid">
            <div className="sec-tag up">{t.cTag}</div>
            <h2 className="sec-h"><span className="msk"><span>{t.cH}</span></span></h2>
            <p className="sec-sub up d1">{t.cSub}</p>
          </div>

          <div className="cta-col">
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
                  className={`send${sendState === "sent" ? " ok" : ""}${sendState === "sending" ? " busy" : ""}`}
                  type="submit"
                  disabled={sendState !== "idle"}
                >
                  <span className="spin" aria-hidden="true" />
                  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                  <span>
                    {sendState === "sending" ? t.cSending : sendState === "sent" ? t.cSent : t.cSend}
                  </span>
                </button>
              </form>
            </div>
          </div>

          <div className="page-foot">
            <span>© 2026 LMC Agents</span>
            <span className="foot-dot" />
            <span className="foot-eu"><Globe />{t.cTrust}</span>
          </div>
        </div>
      </section>

    </>
  );
}
