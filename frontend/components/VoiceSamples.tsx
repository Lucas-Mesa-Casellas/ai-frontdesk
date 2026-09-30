"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;
type Gender = "female" | "male";

// Two voices per language. The recordings don't exist yet (there are no audio
// files in the repo), so every player renders disabled: the row, the waveform
// and the timer are there, the play button just doesn't respond, and nothing
// is requested. When a clip is ready, put it at
//   public/voices/<en|fr|es>-<female|male>.mp3
// and add its id (e.g. "en-female") to READY -- that voice becomes playable,
// the others stay as they are.
const READY = new Set<string>([]);
const AUDIO_EXT = "mp3";

// English, French, Spanish -- each column named in its own language, like the
// language menu.
const LANGS: { code: Lang; file: string; native: string }[] = [
  { code: "EN", file: "en", native: "English" },
  { code: "FR", file: "fr", native: "Français" },
  { code: "ES", file: "es", native: "Español" },
];
const VOICES: { gender: Gender; name: L10n }[] = [
  { gender: "female", name: { EN: "Female voice", ES: "Voz femenina", FR: "Voix féminine" } },
  { gender: "male", name: { EN: "Male voice", ES: "Voz masculina", FR: "Voix masculine" } },
];

const COPY = {
  tag: { EN: "Voices", ES: "Voces", FR: "Voix" } as L10n,
  // what each clip is: the welcome message a caller hears
  clip: { EN: "Welcome message", ES: "Mensaje de bienvenida", FR: "Message d'accueil" } as L10n,
  heading: { EN: "Hear how it answers.", ES: "Escucha cómo contesta.", FR: "Écoutez comment il répond." } as L10n,
  sub: {
    EN: "Choose the voice your callers hear: two voices for each language.",
    ES: "Elige la voz que escucharán tus clientes: dos voces en cada idioma.",
    FR: "Choisissez la voix qu'entendront vos clients : deux voix par langue.",
  } as L10n,
  // the caption over the Calls-page screenshot: what a client gets once the call is over
  after: {
    EN: "After every call, this is what you get.",
    ES: "Después de cada llamada, esto es lo que recibes.",
    FR: "Après chaque appel, voici ce que vous recevez.",
  } as L10n,
  shotAlt: { EN: "The Calls page of the dashboard", ES: "La página de llamadas del panel", FR: "La page Appels du tableau de bord" } as L10n,
  play: { EN: "Play", ES: "Reproducir", FR: "Lire" } as L10n,
  pause: { EN: "Pause", ES: "Pausa", FR: "Pause" } as L10n,
  seek: { EN: "Position", ES: "Posición", FR: "Position" } as L10n,
};

// Fixed, decorative bar heights (a waveform look, not the real waveform) --
// deterministic so server and client render the same thing.
const BARS = Array.from({ length: 34 }, (_, i) => 26 + Math.round(64 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55))));

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function VoiceCard({
  id, language, voice, uiLang, current, onStart,
}: {
  id: string; language: string; voice: string; uiLang: Lang; current: string | null; onStart: (id: string) => void;
}) {
  // screen readers get the language too; on screen the card already names it
  const label = `${language}, ${voice}`;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const usable = READY.has(id) && !failed;

  // The <audio> is server-rendered, so the browser can finish loading its
  // metadata (or fail) BEFORE React attaches the handlers below -- those
  // events are then never seen again. Read the element's current state once
  // on mount so the duration/error aren't lost to that race.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.error) setFailed(true);
    else if (a.readyState >= 1 && Number.isFinite(a.duration)) setDuration(a.duration);
  }, []);

  // One clip at a time: starting another voice pauses this one.
  useEffect(() => {
    if (current !== id && playing) audioRef.current?.pause();
  }, [current, id, playing]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !usable) return;
    if (a.paused) {
      onStart(id);
      a.play().catch(() => setFailed(true));
    } else {
      a.pause();
    }
  };

  const progress = duration > 0 ? time / duration : 0;

  return (
    <li className={`vs-card${playing ? " here" : ""}${usable ? "" : " off"}`}>
      {usable && (
        <audio
          ref={audioRef}
          src={`/voices/${id}.${AUDIO_EXT}`}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setTime(0); }}
          onError={() => setFailed(true)}
        />
      )}

      <div className="vs-head">
        <span className="vs-names"><b>{voice}</b><span>{COPY.clip[uiLang]}</span></span>
        <span className="vs-time">{usable ? `${fmt(time)} / ${fmt(duration)}` : "–:––"}</span>
      </div>

      <div className="vs-player">
      <button
        type="button" className={`vs-btn${playing ? " on" : ""}`} onClick={toggle} disabled={!usable}
        aria-label={`${playing ? COPY.pause[uiLang] : COPY.play[uiLang]}: ${label}`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13M16 5.5v13" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="play"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.2.7l10.2-6.4a.8.8 0 0 0 0-1.4L9.7 4.9a.8.8 0 0 0-1.2.7Z" /></svg>
        )}
      </button>

        <div className="vs-wave">
          <div className="vs-bars" aria-hidden="true">
            {BARS.map((h, i) => (
              <i key={i} className={(i + 0.5) / BARS.length <= progress ? "done" : undefined} style={{ height: `${h}%` }} />
            ))}
          </div>
          {/* Invisible range input over the bars: click/drag/keyboard seeking. */}
          <input
            type="range" min={0} max={1000} step={1} value={Math.round(progress * 1000)}
            disabled={!usable || duration === 0} aria-label={`${COPY.seek[uiLang]}: ${label}`}
            onChange={(e) => {
              const a = audioRef.current;
              if (a && duration > 0) { a.currentTime = (Number(e.target.value) / 1000) * duration; setTime(a.currentTime); }
            }}
          />
        </div>
      </div>
    </li>
  );
}

export default function VoiceSamples({ lang }: { lang: Lang }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [seen, setSeen] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

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

  const shot = `/tour/${lang.toLowerCase()}/calls.png`;

  return (
    <section ref={rootRef} className={`sec voice${seen ? " seen" : ""}`} id="voice" aria-label={COPY.heading[lang]}>
      <div className="wrap">
        <div className="sec-head mid vs-top">
          <p className="eyebrow">{COPY.tag[lang]}</p>
          <h2 className="sec-h">{COPY.heading[lang]}</h2>
          <p className="sec-sub">{COPY.sub[lang]}</p>
        </div>

        <div className={`vs-layout${shotFailed ? " no-shot" : ""}`}>
        <ul className="vs-grid">
          {LANGS.map((l) => (
            <li key={l.code} className="vs-lang">
              <div className="vs-lh">
                <span className="vs-code">{l.code}</span>
                <b>{l.native}</b>
              </div>
              <ul className="vs-cards">
                {VOICES.map((v) => {
                  const id = `${l.file}-${v.gender}`;
                  return (
                    <VoiceCard key={id} id={id} language={l.native} voice={v.name[lang]} uiLang={lang} current={current} onStart={setCurrent} />
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {!shotFailed && (
          <figure className="vs-shot">
            <figcaption className="vs-shot-cap">{COPY.after[lang]}</figcaption>
            {/* the same framing as the dashboard tour above */}
            <div className="vs-frame">
              <div className="vs-chrome">
                <span className="vs-dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="vs-url" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
                  lmcagents.app/dashboard/calls
                </span>
                <span />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={shot} src={shot} alt={COPY.shotAlt[lang]} width={1440} height={900}
                loading="lazy" decoding="async" draggable={false}
                onError={() => setShotFailed(true)}
              />
            </div>
          </figure>
        )}
        </div>
      </div>

      <style>{`
        /* Natural height: three language cards plus the shared section padding. */
        .voice .sec-h { min-height: 0; }
        .voice .sec-sub { min-height: 0; }
        .vs-top, .vs-grid, .vs-shot { opacity: 0; transform: translateY(14px); transition: opacity .8s var(--e-out), transform .8s var(--e-out); }
        .voice.seen .vs-top, .voice.seen .vs-grid, .voice.seen .vs-shot { opacity: 1; transform: none; }
        .voice.seen .vs-grid { transition-delay: .1s; }
        .voice.seen .vs-shot { transition-delay: .18s; }

        /* Desktop: the three language groups (two voice cards each) on the
           left, the Calls page of the dashboard on the right, so the whole
           section stays one screen. Tablet and phone: one column, the
           screenshot under the voices. */
        .vs-layout { display: grid; grid-template-columns: minmax(0, .92fr) minmax(0, 1.2fr); gap: 40px; align-items: center; max-width: 1180px; margin: 0 auto; }
        .vs-layout.no-shot { grid-template-columns: minmax(0, 1fr); }
        .vs-grid { list-style: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
        .vs-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }

        .vs-shot { margin: 0; min-width: 0; }
        .vs-shot-cap { margin: 0 0 12px 2px; font-size: 13px; font-weight: 500; letter-spacing: -.005em; color: var(--text-2); }
        .vs-frame {
          border-radius: 16px; overflow: hidden;
          background: var(--card-bg), #0A0D11; border: 1px solid var(--card-border);
          box-shadow: 0 50px 100px -50px rgba(0,0,0,.95), 0 0 80px -40px rgba(18,185,129,.35);
        }
        .vs-chrome { display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center; gap: 12px; height: 34px; padding: 0 12px; border-bottom: 1px solid var(--hair); }
        .vs-dots { display: flex; gap: 6px; }
        .vs-dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.14); }
        .vs-url {
          display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 11px; border-radius: 7px;
          font-size: 11px; color: var(--text-3); white-space: nowrap; background: rgba(255,255,255,.04); border: 1px solid var(--hair);
        }
        .vs-url svg { width: 10px; height: 10px; stroke: var(--text-3); stroke-width: 1.8; fill: none; stroke-linecap: round; flex: none; }
        .vs-frame img { display: block; width: 100%; height: auto; user-select: none; }
        .vs-lh { display: flex; align-items: center; gap: 10px; margin: 0 2px 12px; }
        .vs-lh b { font-size: 15px; font-weight: 600; letter-spacing: -.015em; }
        .vs-code {
          font-size: 10.5px; font-weight: 600; letter-spacing: .06em; color: var(--jade);
          border: 1px solid rgba(55,226,155,.35); background: rgba(55,226,155,.1); border-radius: 6px; padding: 3px 7px;
        }
        .vs-cards { list-style: none; display: grid; gap: 12px; }
        /* the card surface and hover are the shared ones (globals.css) */
        .vs-card { display: flex; flex-direction: column; gap: 14px; padding: 16px 18px 18px; }
        .vs-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
        .vs-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .vs-names b { font-size: 14.5px; font-weight: 600; letter-spacing: -.01em; }
        .vs-names span { font-size: 12.5px; color: var(--text-3); }
        .vs-time { flex: none; font-size: 11.5px; font-variant-numeric: tabular-nums; color: var(--text-3); }
        .vs-player { display: flex; align-items: center; gap: 12px; }

        .vs-btn {
          flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.06); border: 1.5px solid rgba(55,226,155,.6);
          transition: transform var(--t-fast) var(--e-out), box-shadow var(--t-fast) var(--e-out), background var(--t-fast) var(--e-out), color var(--t-fast), opacity var(--t-fast);
        }
        .vs-btn:hover:not(:disabled) { transform: translateY(-1px); background: rgba(55,226,155,.14); box-shadow: 0 8px 20px -10px rgba(18,185,129,.7); }
        .vs-btn.on { color: #04140D; background: linear-gradient(180deg, var(--jade-bright), var(--jade-2)); border-color: transparent; box-shadow: var(--btn-shadow); }
        .vs-btn:disabled { opacity: .6; cursor: default; }
        .vs-btn svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; fill: none; }
        .vs-btn svg.play { fill: currentColor; stroke: none; margin-left: 2px; }

        .vs-wave { position: relative; flex: 1; min-width: 0; height: 30px; border-radius: 6px; }
        .vs-wave:focus-within { outline: 2px solid rgba(55,226,155,.55); outline-offset: 3px; }
        .vs-bars { position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; }
        .vs-bars i { flex: 1; min-width: 1px; border-radius: 2px; background: rgba(55,226,155,.42); transition: background .15s; }
        .vs-bars i.done { background: var(--jade); }
        .vs-card.off .vs-bars i { background: rgba(55,226,155,.3); }
        .vs-wave input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
        .vs-wave input:disabled { cursor: default; }

        /* tablet and phone: everything in one column, the screenshot last */
        @media (max-width: 1100px) {
          .vs-layout { grid-template-columns: minmax(0, 1fr); gap: 34px; max-width: 720px; }
          .vs-grid { gap: 26px; }
        }
        @media (max-width: 560px) {
          .vs-cards { grid-template-columns: 1fr; }
          .vs-btn { width: 44px; height: 44px; }
          .vs-chrome { grid-template-columns: minmax(0,1fr); }
          .vs-dots, .vs-chrome > span:last-child { display: none; }
          .vs-url { justify-self: start; max-width: 100%; overflow: hidden; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vs-top, .vs-grid, .vs-shot { transition: none; opacity: 1; transform: none; }
        }
      `}</style>
    </section>
  );
}
