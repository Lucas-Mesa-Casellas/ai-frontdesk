"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import { DASH_T } from "@/lib/dash-i18n";
import type { Locale } from "@/lib/locale";

type Status = "idle" | "sending" | "sent" | "err";
const LANGS: Locale[] = ["en", "es", "fr"];

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

  const expired =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("error") === "link";

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

          <div />

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

      <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(18,185,129,.08), transparent 65%)" }} />
        </div>

        <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>

        {status === "sent" ? (
          <div style={{ textAlign: "center" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52, borderRadius: "50%", marginBottom: 20,
              background: "rgba(55,226,155,.12)", border: "1px solid rgba(55,226,155,.26)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#37E29B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
                <path d="m3.5 8 8.5 6 8.5-6" />
              </svg>
            </span>
            <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 600, marginBottom: 10 }}>{t.loginSentTitle}</h1>
            <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.6 }}>{t.loginSentSub(email)}</p>
          </div>
        ) : (
          <>
            <h1 style={{ color: "var(--text)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 10 }}>
              {t.loginTitle}
            </h1>
            <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.6, marginBottom: 26 }}>{t.loginSub}</p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-3)", marginBottom: 8 }}>
                {t.loginLabel}
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.loginPh}
                style={{
                  width: "100%", fontSize: 15, color: "var(--text)",
                  background: "rgba(255,255,255,.028)", border: "1px solid var(--hair-2)",
                  borderRadius: 12, padding: "13px 15px", marginBottom: 16,
                }}
              />
              <button
                type="submit"
                disabled={status === "sending"}
                style={{
                  width: "100%", fontSize: 15, fontWeight: 600, color: "#04140D",
                  padding: "14px 26px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: "linear-gradient(180deg,#5CEBAF,var(--jade-2))",
                  boxShadow: "0 1px 0 rgba(255,255,255,.5) inset, 0 12px 32px -13px rgba(18,185,129,.62)",
                  opacity: status === "sending" ? 0.6 : 1,
                }}
              >
                {status === "sending" ? t.loginSending : t.loginCta}
              </button>
              {status === "err" && <p style={{ color: "#FFC178", fontSize: 13.5, marginTop: 12 }}>{t.loginErr}</p>}
              {expired && status === "idle" && <p style={{ color: "#FFC178", fontSize: 13.5, marginTop: 12 }}>{t.loginExpired}</p>}
            </form>

            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--text-3)", marginTop: 22, textDecoration: "none" }}>
              ← {t.loginBack}
            </a>
          </>
        )}
      </div>
    </div>
    </>
  );
}
