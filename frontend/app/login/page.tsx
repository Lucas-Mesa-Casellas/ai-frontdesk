"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase-client";
import { DASH_T } from "@/lib/dash-i18n";
import type { Locale } from "@/lib/locale";
import Card from "@/components/ui/Card";
import Field from "@/components/ui/Field";

type Status = "idle" | "sending" | "sent" | "err";
const LANGS: Locale[] = ["en", "es", "fr"];

// Whether the URL says the sign-in link was expired/used (?error=link).
// Read through useSyncExternalStore so the server render and the first client
// render agree (both "false"), and the real value is applied right after
// hydration -- reading window.location directly during render made the two
// disagree whenever the query string was present.
const noopSubscribe = () => () => {};
const readExpired = () => new URLSearchParams(window.location.search).get("error") === "link";
const serverExpired = () => false;

export default function LoginPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
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

  const expired = useSyncExternalStore(noopSubscribe, readExpired, serverExpired);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });
    setStatus(error ? "err" : "sent");
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
        {/* atmosphere: a soft jade glow and two very faint orbit rings */}
        <div className="login-atmos" aria-hidden="true">
          <span className="login-glow" />
          <span className="login-ring login-ring-1" />
          <span className="login-ring login-ring-2" />
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
                  {status === "sending" ? t.loginSending : t.loginCta}
                </button>
                {status === "err" && <p className="login-msg" role="alert">{t.loginErr}</p>}
                {expired && status === "idle" && <p className="login-msg" role="alert">{t.loginExpired}</p>}
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
        .login-ring { position: absolute; left: 50%; top: 44%; border-radius: 50%; border: 1px solid rgba(55,226,155,.08); transform: translate(-50%, -50%); }
        .login-ring-1 { width: 620px; height: 620px; }
        .login-ring-2 { width: 900px; height: 900px; border-color: rgba(55,226,155,.045); }
        .login-card { position: relative; width: 100%; max-width: 420px; padding: 36px 34px 30px; }
        .login-card:hover { transform: none; }
        .login-title { font-size: 26px; font-weight: 600; letter-spacing: -.025em; line-height: 1.15; margin: 0 0 10px; }
        .login-sub { font-size: 14px; line-height: 1.6; color: var(--text-2); margin-bottom: 26px; }
        .login-form { display: flex; flex-direction: column; gap: 16px; }
        .login-input { font-size: 15px; padding: 14px 15px; }
        .login-btn { width: 100%; height: 48px; font-size: 15px; }
        .login-msg { font-size: 13.5px; color: var(--warning); }
        .login-back { display: inline-flex; align-items: center; gap: 6px; margin-top: 22px; font-size: 13.5px; color: var(--text-3); text-decoration: none; transition: color .2s var(--e-out); }
        .login-back:hover { color: var(--text); }
        .login-sent { text-align: center; }
        .login-sent .login-sub { margin-bottom: 0; }
        .login-ic {
          display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; margin-bottom: 20px;
          color: var(--jade); background: rgba(55,226,155,.09); border: 1px solid rgba(55,226,155,.24);
        }
        @media (max-width: 480px) {
          .login-shell { padding-top: 84px; }
          .login-card { padding: 28px 22px 24px; }
        }
      `}</style>
    </>
  );
}
