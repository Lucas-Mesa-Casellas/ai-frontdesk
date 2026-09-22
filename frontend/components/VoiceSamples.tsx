"use client";

import { useEffect, useRef, useState } from "react";

type Lang = "EN" | "ES" | "FR";
type L10n = Record<Lang, string>;
type VoiceId = "female" | "male";

// The real clips don't exist yet (being generated separately). Until they do,
// the players render disabled: the card, the waveform and the timer are all
// there, the play button just doesn't respond. No "coming soon" label. Once
// public/tour/voice/<female|male>.<AUDIO_EXT> are in place, flip this to true
// -- that is the only change needed (the layout doesn't change).
export const VOICE_SAMPLES_READY = false;
const AUDIO_EXT = "mp3";

// Two voice options rather than one card per language: every voice answers
// in whichever language the caller used, so what a visitor actually needs to
// compare here is the voice itself, not a language.
type Voice = { id: VoiceId; code: string; name: L10n; note: L10n };
const VOICES: Voice[] = [
  {
    id: "female", code: "F",
    name: { EN: "Female voice", ES: "Voz femenina", FR: "Voix féminine" },
    note: { EN: "Warm and clear", ES: "Cálida y clara", FR: "Chaleureuse et claire" },
  },
  {
    id: "male", code: "M",
    name: { EN: "Male voice", ES: "Voz masculina", FR: "Voix masculine" },
    note: { EN: "Calm and confident", ES: "Serena y segura", FR: "Posée et assurée" },
  },
];

const COPY = {
  tag: { EN: "Voice & languages", ES: "Voz e idiomas", FR: "Voix et langues" } as L10n,
  heading: { EN: "Hear how it answers.", ES: "Escucha cómo contesta.", FR: "Écoutez comment il répond." } as L10n,
  sub: {
    EN: "Choose the voice your callers hear. Either one answers in English, Spanish and French.",
    ES: "Elige la voz que oyen tus llamantes. Cualquiera de las dos contesta en español, inglés y francés.",
    FR: "Choisissez la voix qu'entendent vos appelants. Chacune répond en français, anglais et espagnol.",
  } as L10n,
  play: { EN: "Play", ES: "Reproducir", FR: "Lire" } as L10n,
  pause: { EN: "Pause", ES: "Pausa", FR: "Pause" } as L10n,
  seek: { EN: "Position", ES: "Posición", FR: "Position" } as L10n,
};

// Fixed, decorative bar heights (a waveform look, not the real waveform) --
// deterministic so server and client render the same thing.
const BARS = Array.from({ length: 44 }, (_, i) => 26 + Math.round(64 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55))));

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function VoiceCard({
  voice, uiLang, current, onStart,
}: {
  voice: Voice; uiLang: Lang; current: VoiceId | null; onStart: (c: VoiceId) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const usable = VOICE_SAMPLES_READY && !failed;

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

  // One clip at a time: starting another card pauses this one.
  useEffect(() => {
    if (current !== voice.id && playing) audioRef.current?.pause();
  }, [current, voice.id, playing]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !usable) return;
    if (a.paused) {
      onStart(voice.id);
      a.play().catch(() => setFailed(true));
    } else {
      a.pause();
    }
  };

  const progress = duration > 0 ? time / duration : 0;
  const name = voice.name[uiLang];

  return (
    // "here" marks the clip that's actually playing.
    <li className={`vs-card${playing ? " here" : ""}${usable ? "" : " off"}`}>
      {usable && (
        <audio
          ref={audioRef}
          src={`/tour/voice/${voice.id}.${AUDIO_EXT}`}
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
        <span className="vs-code">{voice.code}</span>
        <span className="vs-names">
          <b>{name}</b>
          <span>{voice.note[uiLang]}</span>
        </span>
      </div>

      <div className="vs-player">
        <button
          type="button" className={`vs-btn${playing ? " on" : ""}`} onClick={toggle} disabled={!usable}
          aria-label={`${playing ? COPY.pause[uiLang] : COPY.play[uiLang]}: ${name}`}
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
            disabled={!usable || duration === 0} aria-label={`${COPY.seek[uiLang]}: ${name}`}
            onChange={(e) => {
              const a = audioRef.current;
              if (a && duration > 0) { a.currentTime = (Number(e.target.value) / 1000) * duration; setTime(a.currentTime); }
            }}
          />
        </div>

        <span className="vs-time">{usable ? `${fmt(time)} / ${fmt(duration)}` : "–:––"}</span>
      </div>
    </li>
  );
}

export default function VoiceSamples({ lang }: { lang: Lang }) {
  const [current, setCurrent] = useState<VoiceId | null>(null);
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
          <h2 className="sec-h">{COPY.heading[lang]}</h2>
          <p className="sec-sub">{COPY.sub[lang]}</p>
        </div>

        <ul className="vs-grid">
          {VOICES.map((v) => (
            <VoiceCard key={v.id} voice={v} uiLang={lang} current={current} onStart={setCurrent} />
          ))}
        </ul>

      </div>

      <style>{`
        /* Natural height: the section is as tall as its two players plus the
           shared section padding -- no artificial screen-filling. */
        .voice .sec-h { min-height: 0; }
        .voice .sec-sub { min-height: 0; }
        .vs-top, .vs-grid { opacity: 0; transform: translateY(14px); transition: opacity .9s var(--e-out), transform .9s var(--e-out); }
        .voice.seen .vs-top, .voice.seen .vs-grid { opacity: 1; transform: none; }
        .voice.seen .vs-grid { transition-delay: .1s; }

        .vs-grid { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; max-width: 720px; margin: 0 auto; }
        .vs-card {
          display: flex; flex-direction: column; gap: 18px; padding: 24px 22px 22px; border-radius: var(--r-xl);
          background: linear-gradient(180deg, rgba(18,185,129,.05), rgba(255,255,255,.014) 60%);
          border: 1px solid rgba(55,226,155,.14); box-shadow: 0 34px 70px -40px rgba(0,0,0,.9);
          transition: border-color .4s var(--e-out), transform .4s var(--e-out), box-shadow .4s var(--e-out);
        }
        .vs-card:not(.off):hover { transform: translateY(-3px); border-color: rgba(55,226,155,.3); box-shadow: 0 42px 84px -42px rgba(0,0,0,.95); }
        .vs-card.here { border-color: rgba(55,226,155,.3); box-shadow: 0 34px 70px -40px rgba(0,0,0,.9), 0 0 0 1px rgba(55,226,155,.08); }
        .vs-head { display: flex; align-items: center; gap: 12px; }
        .vs-code {
          font-size: 11px; font-weight: 600; letter-spacing: .06em; color: var(--jade);
          border: 1px solid rgba(55,226,155,.35); background: rgba(55,226,155,.1); border-radius: 6px; padding: 3px 7px;
        }
        .vs-names { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .vs-names b { font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
        .vs-names span { font-size: 12.5px; color: var(--text-3); }

        .vs-player { display: flex; align-items: center; gap: 12px; }
        .vs-btn {
          flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
          color: var(--jade); background: rgba(55,226,155,.06); border: 1.5px solid rgba(55,226,155,.7);
          box-shadow: 0 0 22px -8px rgba(18,185,129,.6);
          transition: transform .24s var(--e-out), box-shadow .24s var(--e-out), opacity .2s, background .2s, color .2s;
        }
        .vs-btn:hover:not(:disabled) { transform: translateY(-1.5px); background: rgba(55,226,155,.14); }
        .vs-btn.on { color: #04140D; background: linear-gradient(180deg, #5CEBAF, var(--jade-2)); border-color: transparent; }
        .vs-btn:disabled { opacity: .55; cursor: default; }
        .vs-btn svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; fill: none; }
        .vs-btn svg.play { fill: currentColor; stroke: none; margin-left: 2px; }

        .vs-wave { position: relative; flex: 1; min-width: 0; height: 52px; border-radius: 8px; }
        .vs-wave:focus-within { outline: 2px solid rgba(55,226,155,.55); outline-offset: 3px; }
        .vs-bars { position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; }
        .vs-bars i { flex: 1; min-width: 1px; border-radius: 2px; background: rgba(55,226,155,.42); transition: background .15s; }
        .vs-bars i.done { background: var(--jade); }
        .vs-card.off .vs-bars i { background: rgba(55,226,155,.34); }
        .vs-wave input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
        .vs-wave input:disabled { cursor: default; }
        .vs-time { flex: none; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-3); min-width: 6.4em; text-align: right; }

        @media (max-width: 640px) {
          .vs-grid { grid-template-columns: 1fr; max-width: 420px; }
        }
        @media (max-width: 480px) {
          .vs-card { padding: 18px 16px 16px; }
          .vs-btn { width: 52px; height: 52px; }
          .vs-time { min-width: 0; font-size: 11.5px; }
          .vs-wave { height: 44px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vs-top, .vs-grid { transition: none; opacity: 1; transform: none; }
          .vs-card:not(.off):hover { transform: none; }
        }
      `}</style>
    </section>
  );
}
