"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase-client";
import { DASH_T } from "@/lib/dash-i18n";
import type { Locale } from "@/lib/locale";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";
import AuthWave from "@/components/AuthWave";

type Status = "idle" | "sending" | "sent" | "err" | "rate" | "fail";
const LANGS: Locale[] = ["en", "es", "fr"];

// Why the URL says the sign-in link failed: "link" (expired / already used) or
// "browser" (opened in a different browser than it was requested in), else "".
// Read through useSyncExternalStore so the server render and the first client
// render agree (both "false"), and the real value is applied right after
// hydration -- reading window.location directly during render made the two
// disagree whenever the query string was present.
const noopSubscribe = () => () => {};
const readLinkError = () => {
  const e = new URLSearchParams(window.location.search).get("error");
  return e === "link" || e === "browser" ? e : "";
};
const serverLinkError = () => "";

export default function LoginPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "err">("idle");
  const t = DASH_T[lang];

  const [menuOpen, setMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )lmc_locale=([^;]+)/);
    const v = m?.[1];
    if (v === "en" || v === "es" || v === "fr") setLang(v);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function pickLang(code: Locale) {
    setLang(code);
    document.cookie = `lmc_locale=${code};path=/;max-age=31536000`;
    setMenuOpen(false);
  }

  const linkError = useSyncExternalStore(noopSubscribe, readLinkError, serverLinkError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    if (!error) return setStatus("sent");
    // Say what actually went wrong: asking again within a minute is a rate
    // limit (429), not a wrong address; only a refused sign-up means "not linked".
    const rateLimited = error.status === 429 || /rate_limit/.test(error.code ?? "");
    const notLinked = error.status === 422 || error.code === "otp_disabled" || error.code === "signup_disabled";
    setStatus(rateLimited ? "rate" : notLinked ? "err" : "fail");
  }

  // The same email also carries a one-time code: typing it signs in without the
  // link, so it works when the link opens in another browser or on another
  // device, or when a mail scanner already used the link.
  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    if (codeStatus === "checking") return;
    setCodeStatus("checking");
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) return setCodeStatus("err");
    window.location.assign("/dashboard");
  }

  return (
    <>
      <nav>
        <div className="wrap nav-grid">
          <a href="/" className="logo" aria-label="LMC Agents home">
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
                <path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="18.6" cy="5.4" r="2.85" fill="#04140D" />
              </svg>
            </span>
            <span className="logo-txt">LMC Agents</span>
          </a>

          <div className="nav-links" />

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
                <span>{lang.toUpperCase()}</span>
                <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 4.5 6 8l3.5-3.5" />
                </svg>
              </button>
              <div className={`lang-menu${menuOpen ? " open" : ""}`} role="listbox" aria-label="Language">
                {LANGS.map((c) => (
                  <button key={c} data-l={c} role="option" aria-selected={lang === c} onClick={() => pickLang(c)}>
                    <span className="code">{c.toUpperCase()}</span>
                    {DASH_T[c].langName}
                    <svg className="mark" viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="login-shell">
        {/* atmosphere: a soft jade glow, and a voice-waveform line passing behind the card */}
        <div className="login-atmos" aria-hidden="true">
          <span className="login-glow" />
          <AuthWave />
        </div>

        <Card as="section" className="login-card">
          {status === "sent" ? (
            <div className="login-sent">
              <span className="login-ic">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
                  <path d="m3.5 8 8.5 6 8.5-6" />
                </svg>
              </span>
              <h1 className="login-title">{t.loginSentTitle}</h1>
              <p className="login-sub">{t.loginSentSub(email)}</p>
              <form onSubmit={handleCode} className="login-form login-code">
                <p className="login-hint">{t.loginCodeHint} {t.loginOnce}</p>
                <Field label={t.loginCodeLabel} htmlFor="login-code">
                  <input
                    id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required
                    value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setCodeStatus("idle"); }}
                    className="ui-input login-input login-codeinput" placeholder="123456"
                  />
                </Field>
                <button type="submit" disabled={codeStatus === "checking" || code.length < 6} className="ui-btn ui-btn--secondary login-btn">
                  {codeStatus === "checking" && <span className="login-spin" aria-hidden="true" />}
                  {t.loginCodeCta}
                </button>
                {codeStatus === "err" && <p className="login-msg" role="alert">{t.loginCodeErr}</p>}
              </form>
            </div>
          ) : (
            <>
              <h1 className="login-title">{t.loginTitle}</h1>
              <p className="login-sub">{t.loginSub}</p>

              <form onSubmit={handleSubmit} className="login-form">
                <Field label={t.loginLabel} htmlFor="login-email">
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.loginPh}
                    className="ui-input login-input"
                  />
                </Field>
                <button type="submit" disabled={status === "sending"} className="ui-btn ui-btn--primary login-btn">
                  {status === "sending" ? <><span className="login-spin" aria-hidden="true" />{t.loginSending}</> : t.loginCta}
                </button>
                {status === "err" && <p className="login-msg" role="alert">{t.loginErr}</p>}
                {status === "rate" && <p className="login-msg" role="alert">{t.loginRate}</p>}
                {status === "fail" && <p className="login-msg" role="alert">{t.loginFail}</p>}
                {status === "idle" && linkError === "link" && <p className="login-msg" role="alert">{t.loginExpired}</p>}
                {status === "idle" && linkError === "browser" && <p className="login-msg" role="alert">{t.loginBrowser}</p>}
              </form>

              <a href="/" className="login-back">← {t.loginBack}</a>
            </>
          )}
        </Card>
      </div>

      <style>{`
        .login-shell { position: relative; min-height: 100svh; display: flex; align-items: center; justify-content: center; padding: 96px 20px 40px; background: var(--bg); overflow: hidden; }
        .login-atmos { position: absolute; inset: 0; pointer-events: none; }
        .login-glow { position: absolute; left: 50%; top: 42%; width: 760px; height: 520px; transform: translate(-50%, -50%); background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(18,185,129,.11), transparent 68%); }
        /* the card sits 28px below the shell's middle (96px of top padding, 40px of bottom), so the line does too */
        .login-atmos .aw { --aw-offset: 28px; }
        .login-card { position: relative; width: 100%; max-width: 420px; padding: 36px 34px 30px; animation: login-in .25s var(--e-out) both; }
        .login-card:hover { transform: none; }
        .login-card::after { content: ""; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; opacity: 0;
          box-shadow: 0 0 0 1px rgba(55,226,155,.5), 0 0 38px -4px rgba(55,226,155,.35); animation: login-glow-pulse 1.8s ease-out .15s 1 both; }
        @keyframes login-glow-pulse { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
        .login-title { font-size: 26px; font-weight: 600; letter-spacing: -.025em; line-height: 1.15; margin: 0 0 10px; }
        .login-sub { font-size: 14px; line-height: 1.6; color: var(--text-2); margin-bottom: 26px; }
        .login-form { display: flex; flex-direction: column; }
        .login-form > * + * { margin-top: 16px; }
        .login-input { font-size: 15px; padding: 14px 15px; transition: border-color .25s var(--e-out), background .25s var(--e-out), box-shadow .25s var(--e-out); }
        .login-btn { width: 100%; height: 48px; font-size: 15px; }
        .login-btn.ui-btn--secondary:hover:not(:disabled) { transform: translateY(-1px); }
        .login-btn:active:not(:disabled) { transform: translateY(0) scale(.985); transition-duration: .08s; }
        .login-btn:disabled { cursor: progress; }
        /* a small spinner while a request is out; the label next to it is unchanged */
        .login-spin { width: 15px; height: 15px; border-radius: 50%; flex: none; border: 2px solid currentColor; border-right-color: transparent; opacity: .8; animation: login-spin .7s linear infinite; }
        /* messages ease in (fade + the space opens smoothly), so nothing jumps */
        .login-msg { font-size: 13.5px; line-height: 1.5; color: var(--warning); overflow: hidden; animation: login-msg-in .3s var(--e-out) both; }
        .login-back { display: inline-flex; align-items: center; gap: 6px; margin-top: 22px; font-size: 13.5px; color: var(--text-3); text-decoration: none; transition: color .2s var(--e-out); }
        .login-back:hover { color: var(--text); }
        .login-sent { text-align: center; animation: login-fade .35s var(--e-out) both; }
        .login-code { margin-top: 24px; padding-top: 22px; border-top: 1px solid var(--hair); text-align: left; }
        .login-hint { font-size: 13px; color: var(--text-3); line-height: 1.5; }
        .login-codeinput { letter-spacing: .18em; font-variant-numeric: tabular-nums; }
        .login-sent .login-sub { margin-bottom: 0; }
        .login-ic {
          display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; margin-bottom: 20px;
          color: var(--jade); background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.24);
          animation: login-pop .5s cubic-bezier(.2, .9, .3, 1.15) both;
        }
        @keyframes login-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes login-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes login-pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
        @keyframes login-spin { to { transform: rotate(360deg); } }
        @keyframes login-msg-in { from { opacity: 0; max-height: 0; margin-top: 0; } to { opacity: 1; max-height: 8em; margin-top: 16px; } }
        @media (prefers-reduced-motion: reduce) {
          .login-card, .login-card::after, .login-sent, .login-ic, .login-msg, .login-spin { animation: none !important; }
          .login-btn, .login-input { transition: none !important; transform: none !important; }
        }
        @media (max-width: 480px) {
          .login-shell { padding-top: 84px; }
          .login-atmos .aw { --aw-offset: 22px; }
          .login-card { padding: 28px 22px 24px; }
        }
      `}</style>
    </>
  );
}
