"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;
type Gender = "f" | "m";

// The six recordings of the welcome message (one female and one male voice per
// language) live at public/tour/<en|es|fr>/welcome-<f|m>.mp3. Set this to false
// to show the player disabled again (nothing is requested then).
export const VOICE_SAMPLES_READY = true;

const LANGS: { code: Lang; file: string; aria: string }[] = [
  { code: "EN", file: "en", aria: "English" },
  { code: "ES", file: "es", aria: "Español" },
  { code: "FR", file: "fr", aria: "Français" },
];
const VOICES: { gender: Gender; name: L10n }[] = [
  { gender: "f", name: { EN: "Female voice", ES: "Voz femenina", FR: "Voix féminine" } },
  { gender: "m", name: { EN: "Male voice", ES: "Voz masculina", FR: "Voix masculine" } },
];

// Exactly what is said in each recording.
const TRANSCRIPTS: Record<Lang, Record<Gender, string>> = {
  EN: {
    f: "Hello, this is the AI assistant for LMC Agents. Bonjour, je peux aussi vous répondre en français. Hola, también puedo atenderle en español. How can I help you today?",
    m: "Hello, this is the AI assistant for LMC Agents. Bonjour, je peux aussi vous répondre en français. Hola, también puedo atenderle en español. How can I help you today?",
  },
  FR: {
    f: "Bonjour, ici l'assistante IA de LMC Agents. Hello, I can also help you in English. Hola, también puedo atenderle en español. Comment puis-je vous aider ?",
    m: "Bonjour, ici l'assistant IA de LMC Agents. Hello, I can also help you in English. Hola, también puedo atenderle en español. Comment puis-je vous aider ?",
  },
  ES: {
    f: "Hola, soy el asistente IA de LMC Agents. Hello, I can also help you in English. Bonjour, je peux aussi vous répondre en français. ¿En qué puedo ayudarle?",
    m: "Hola, soy el asistente IA de LMC Agents. Hello, I can also help you in English. Bonjour, je peux aussi vous répondre en français. ¿En qué puedo ayudarle?",
  },
};

const COPY = {
  tag: { EN: "Voices", ES: "Voces", FR: "Voix" } as L10n,
  clip: { EN: "Welcome message", ES: "Mensaje de bienvenida", FR: "Message d'accueil" } as L10n,
  heading: { EN: "Hear how it answers.", ES: "Escucha cómo contesta.", FR: "Écoutez comment il répond." } as L10n,
  sub: {
    EN: "Two voices in each language.",
    ES: "Dos voces en cada idioma.",
    FR: "Deux voix par langue.",
  } as L10n,
  langLabel: { EN: "Language", ES: "Idioma", FR: "Langue" } as L10n,
  voiceLabel: { EN: "Voice", ES: "Voz", FR: "Voix" } as L10n,
  transcript: { EN: "What you hear", ES: "Lo que escuchas", FR: "Ce que vous entendez" } as L10n,
  missing: {
    EN: "This recording isn't available right now.",
    ES: "Esta grabación no está disponible ahora mismo.",
    FR: "Cet enregistrement n'est pas disponible pour le moment.",
  } as L10n,
  play: { EN: "Play", ES: "Reproducir", FR: "Lire" } as L10n,
  pause: { EN: "Pause", ES: "Pausa", FR: "Pause" } as L10n,
  seek: { EN: "Position", ES: "Posición", FR: "Position" } as L10n,
};

// Fixed, decorative bar heights (a waveform look, not the real waveform) --
// deterministic so server and client render the same thing.
const BARS = Array.from({ length: 40 }, (_, i) => 26 + Math.round(64 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55))));

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// One clip's player. It is keyed by the clip (language + voice) in the parent,
// so choosing another language or voice unmounts it: the old clip stops and the
// new one starts from zero, with nothing to reset by hand.
function Player({ src, uiLang, title }: { src: string; uiLang: Lang; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const usable = VOICE_SAMPLES_READY && !failed;

  // The <audio> is server-rendered, so the browser can finish loading its
  // metadata (or fail) BEFORE React attaches the handlers below -- those
  // events are then never seen again. Read the element's state once on mount.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.error) setFailed(true);
    else if (a.readyState >= 1 && Number.isFinite(a.duration)) setDuration(a.duration);
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !usable) return;
    if (a.paused) a.play().catch(() => setFailed(true));
    else a.pause();
  };
  const progress = duration > 0 ? time / duration : 0;

  return (
    <>
      {VOICE_SAMPLES_READY && (
        <audio
          ref={audioRef} src={src} preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setTime(0); }}
          onError={() => setFailed(true)}
        />
      )}
      <div className={`vs-player${usable ? "" : " off"}`}>
        <button
          type="button" className={`vs-btn${playing ? " on" : ""}`} onClick={toggle} disabled={!usable}
          aria-label={`${playing ? COPY.pause[uiLang] : COPY.play[uiLang]}: ${title}`}
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
            disabled={!usable || duration === 0} aria-label={`${COPY.seek[uiLang]}: ${title}`}
            onChange={(e) => {
              const a = audioRef.current;
              if (a && duration > 0) { a.currentTime = (Number(e.target.value) / 1000) * duration; setTime(a.currentTime); }
            }}
          />
        </div>
        <span className="vs-time">{usable ? `${fmt(time)} / ${fmt(duration)}` : "–:–– / –:––"}</span>
      </div>
      {failed && <p className="vs-missing" role="status">{COPY.missing[uiLang]}</p>}
    </>
  );
}

export default function VoiceSamples({ lang }: { lang: Lang }) {
  // The language selector starts on the visitor's own language; a choice made
  // here holds until they change the site's language again.
  const [pickedLang, setPickedLang] = useState<{ forLang: Lang; value: Lang } | null>(null);
  const [gender, setGender] = useState<Gender>("f");
  const clipLang: Lang = pickedLang && pickedLang.forLang === lang ? pickedLang.value : lang;
  const file = LANGS.find((l) => l.code === clipLang)!.file;
  const src = `/tour/${file}/welcome-${gender}.mp3`;
  const voiceName = VOICES.find((v) => v.gender === gender)!.name[lang];

  const [seen, setSeen] = useState(false);
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

  return (
    <section ref={rootRef} className={`sec voice${seen ? " seen" : ""}`} id="voice" aria-label={COPY.heading[lang]}>
      <div className="wrap">
        <div className="sec-head mid vs-top">
          <p className="eyebrow">{COPY.tag[lang]}</p>
          <h2 className="sec-h">{COPY.heading[lang]}</h2>
          <p className="sec-sub">{COPY.sub[lang]}</p>
        </div>

        <div className="vs-layout">
          <div className="vs-card">
            <div className="vs-sels">
              <div className="vs-sel">
                <span className="vs-sel-l" id="vs-l-lang">{COPY.langLabel[lang]}</span>
                <div className="vs-seg" role="radiogroup" aria-labelledby="vs-l-lang">
                  {LANGS.map((l) => (
                    <button
                      key={l.code} type="button" role="radio" aria-checked={clipLang === l.code} aria-label={l.aria} lang={l.file}
                      className={clipLang === l.code ? "on" : undefined}
                      onClick={() => setPickedLang({ forLang: lang, value: l.code })}
                    >
                      {l.code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="vs-sel">
                <span className="vs-sel-l" id="vs-l-voice">{COPY.voiceLabel[lang]}</span>
                <div className="vs-seg" role="radiogroup" aria-labelledby="vs-l-voice">
                  {VOICES.map((v) => (
                    <button
                      key={v.gender} type="button" role="radio" aria-checked={gender === v.gender}
                      className={gender === v.gender ? "on" : undefined}
                      onClick={() => setGender(v.gender)}
                    >
                      {v.name[lang]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="vs-clip"><b>{voiceName}</b><span>{COPY.clip[lang]}</span></p>
            <Player key={src} src={src} uiLang={lang} title={`${voiceName}, ${clipLang}`} />

            <div className="vs-tr">
              <span className="vs-tr-l">{COPY.transcript[lang]}</span>
              <p lang={clipLang.toLowerCase()}>{TRANSCRIPTS[clipLang][gender]}</p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .voice .sec-h { min-height: 0; }
        .voice .sec-sub { min-height: 0; }
        .vs-top, .vs-layout { opacity: 0; transform: translateY(14px); transition: opacity .8s var(--e-out), transform .8s var(--e-out); }
        .voice.seen .vs-top, .voice.seen .vs-layout { opacity: 1; transform: none; }
        .voice.seen .vs-layout { transition-delay: .1s; }

        /* the player, centred */
        .vs-layout { max-width: 620px; margin: 0 auto; }

        .vs-card { display: flex; flex-direction: column; gap: 18px; padding: 24px; }
        .vs-sels { display: flex; flex-wrap: wrap; gap: 16px 22px; }
        .vs-sel { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .vs-sel-l { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); }
        .vs-seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(255,255,255,.03); border: 1px solid var(--hair); }
        .vs-seg button {
          min-height: 34px; padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--text-3); white-space: nowrap;
          transition: color var(--t-fast) var(--e-out), background var(--t-fast) var(--e-out);
        }
        .vs-seg button:hover { color: var(--text); }
        .vs-seg button.on { color: #04140D; font-weight: 600; background: linear-gradient(180deg, var(--jade-bright), var(--jade-2)); }
        .vs-seg button:focus-visible { outline: 2px solid var(--jade); outline-offset: 2px; }
        .vs-clip { display: flex; flex-direction: column; gap: 2px; margin: 0; }
        .vs-clip b { font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
        .vs-clip span { font-size: 12.5px; color: var(--text-3); }

        .vs-player { display: flex; align-items: center; gap: 14px; }
        .vs-time { flex: none; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-3); min-width: 76px; text-align: right; }
        .vs-btn {
          flex: none; width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.06); border: 1.5px solid rgba(55,226,155,.6);
          transition: transform var(--t-fast) var(--e-out), box-shadow var(--t-fast) var(--e-out), background var(--t-fast) var(--e-out), color var(--t-fast), opacity var(--t-fast);
        }
        .vs-btn:hover:not(:disabled) { transform: translateY(-1px); background: rgba(55,226,155,.14); box-shadow: 0 8px 20px -10px rgba(18,185,129,.7); }
        .vs-btn.on { color: #04140D; background: linear-gradient(180deg, var(--jade-bright), var(--jade-2)); border-color: transparent; box-shadow: var(--btn-shadow); }
        .vs-btn:disabled { opacity: .6; cursor: default; }
        .vs-btn:focus-visible { outline: 2px solid var(--jade); outline-offset: 3px; }
        .vs-btn svg { width: 19px; height: 19px; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; fill: none; }
        .vs-btn svg.play { fill: currentColor; stroke: none; margin-left: 2px; }
        .vs-wave { position: relative; flex: 1; min-width: 0; height: 36px; border-radius: 6px; }
        .vs-wave:focus-within { outline: 2px solid rgba(55,226,155,.55); outline-offset: 3px; }
        .vs-bars { position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; }
        .vs-bars i { flex: 1; min-width: 1px; border-radius: 2px; background: rgba(55,226,155,.42); transition: background .15s; }
        .vs-bars i.done { background: var(--jade); }
        .vs-player.off .vs-bars i { background: rgba(55,226,155,.3); }
        .vs-wave input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
        .vs-wave input:disabled { cursor: default; }
        .vs-missing { margin: -6px 0 0; font-size: 12.5px; color: #E5877B; }

        .vs-tr { padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,.022); border: 1px solid var(--border); }
        .vs-tr-l { display: block; margin-bottom: 7px; font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); }
        .vs-tr p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--text-2); }

        @media (max-width: 560px) {
          .vs-card { padding: 18px; }
          .vs-sels { flex-direction: column; gap: 14px; }
          .vs-seg button { padding: 0 12px; min-height: 40px; }
          .vs-btn { width: 52px; height: 52px; }
          .vs-time { min-width: 0; font-size: 11.5px; }
          .vs-player { gap: 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vs-top, .vs-layout { transition: none; opacity: 1; transform: none; }
        }
      `}</style>
    </section>
  );
}
