import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// The sign-in link in the email points here:
//   /auth/confirm?token_hash=...&type=email[&next=/dashboard]
//
// GET never verifies anything. Mail scanners (Outlook Safe Links, corporate
// gateways, some phone mail apps) open every link in a message before the person
// does, and verifying on GET would spend the one-time token on the scanner. So GET
// only shows a page with one "Continue" button, and the button POSTs the same
// values back; only that POST verifies the token and opens the session. A scanner
// does not press buttons.
//
// Unlike /auth/callback (kept for emails already sent) this needs no browser-held
// PKCE verifier, so the link works from any browser or device.

type Locale = "en" | "es" | "fr";

const COPY: Record<Locale, { title: string; sub: string; cta: string; back: string }> = {
  en: { title: "Confirm your sign-in", sub: "One more step: continue to open your dashboard.", cta: "Continue", back: "Back to lmcagents.app" },
  es: { title: "Confirma tu acceso", sub: "Un paso más: continúa para abrir tu panel.", cta: "Continuar", back: "Volver a lmcagents.app" },
  fr: { title: "Confirmez votre connexion", sub: "Encore une étape : continuez pour ouvrir votre tableau de bord.", cta: "Continuer", back: "Retour à lmcagents.app" },
};

const isLocale = (v: string | null | undefined): v is Locale => v === "en" || v === "es" || v === "fr";

// The email carries the business's language (&lang=fr|es|en) and it wins when valid;
// otherwise the language the visitor chose on the site, else the browser's, else English.
function pickLocale(request: Request, lang?: string | null): Locale {
  if (isLocale(lang)) return lang;
  const fromCookie = /(?:^|;\s*)lmc_locale=(en|es|fr)\b/.exec(request.headers.get("cookie") ?? "")?.[1];
  if (fromCookie) return fromCookie as Locale;
  const first = (request.headers.get("accept-language") ?? "").slice(0, 2).toLowerCase();
  return first === "es" || first === "fr" ? first : "en";
}

// Only a genuine same-origin relative path. Rejects absolute and protocol-relative
// URLs ("//evil.com", "https://...") and the backslash variant ("/\evil.com") that
// some browsers fold into "//evil.com".
function safeNext(raw: string | null | undefined): string {
  return raw && /^\/(?!\/|\\)[^\s\\]*$/.test(raw) ? raw : "/dashboard";
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"));

  // nothing usable in the link: straight to the "request a new email" message
  if (!tokenHash || type !== "email") {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }

  const langParam = searchParams.get("lang");
  const lang = pickLocale(request, langParam);
  const t = COPY[lang];
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="same-origin">
<title>${esc(t.title)} · LMC Agents</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100svh;display:grid;place-items:center;padding:20px;background:#08090C;color:#FBFAF8;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
  main{width:100%;max-width:420px;padding:36px 34px 30px;border-radius:20px;background:linear-gradient(180deg,#10141A,#0B0E12);
    border:1px solid rgba(55,226,155,.22);box-shadow:0 40px 80px -40px rgba(0,0,0,.9);animation:in .25s cubic-bezier(.22,1,.36,1) both}
  .logo{display:flex;align-items:center;gap:11px;margin-bottom:26px;font-weight:600;font-size:17px}
  .mark{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(180deg,#5CEBAF,#12B981)}
  h1{margin:0 0 10px;font-size:26px;font-weight:600;letter-spacing:-.025em;line-height:1.15}
  p{margin:0 0 26px;font-size:14px;line-height:1.6;color:#B9BDC6}
  button{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;height:48px;border:0;border-radius:999px;
    font:600 15px system-ui,-apple-system,sans-serif;color:#04140D;cursor:pointer;background:linear-gradient(180deg,#5CEBAF,#12B981);
    transition:transform .18s cubic-bezier(.22,1,.36,1),filter .18s,box-shadow .2s}
  button:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.05);box-shadow:0 14px 30px -14px rgba(18,185,129,.7)}
  button:active:not(:disabled){transform:scale(.985);transition-duration:.08s}
  button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(55,226,155,.4)}
  button:disabled{cursor:progress;opacity:.85}
  button.busy::before{content:"";width:15px;height:15px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;opacity:.8;animation:spin .7s linear infinite}
  @keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){main,button.busy::before{animation:none}button{transition:none}button:hover:not(:disabled),button:active:not(:disabled){transform:none}}
  a{display:inline-block;margin-top:22px;font-size:13.5px;color:#7C828F;text-decoration:none;transition:color .2s}
  a:hover{color:#FBFAF8}
  @media (max-width:480px){main{padding:28px 22px 24px}}
</style>
</head>
<body>
<main>
  <div class="logo"><span class="mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17.6 5.6a9 9 0 1 0 2.2 3.6" stroke="#04140D" stroke-width="2.8" stroke-linecap="round"/><circle cx="18.6" cy="5.4" r="2.85" fill="#04140D"/></svg></span>LMC Agents</div>
  <h1>${esc(t.title)}</h1>
  <p>${esc(t.sub)}</p>
  <form method="POST" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${esc(tokenHash)}">
    <input type="hidden" name="type" value="${esc(type)}">
    <input type="hidden" name="next" value="${esc(next)}">
    ${isLocale(langParam) ? `<input type="hidden" name="lang" value="${langParam}">` : ""}
    <button type="submit">${esc(t.cta)}</button>
  </form>
  <a href="/">← ${esc(t.back)}</a>
</main>
<script>
  // one press only: the button locks and shows a spinner while the request is out
  (function () {
    var f = document.querySelector("form"), b = f.querySelector("button");
    f.addEventListener("submit", function (e) {
      if (f.getAttribute("data-sent")) { e.preventDefault(); return; }
      f.setAttribute("data-sent", "1"); b.disabled = true; b.classList.add("busy");
    });
    // coming back with the Back button must not leave a dead button
    addEventListener("pageshow", function (e) {
      if (e.persisted) { f.removeAttribute("data-sent"); b.disabled = false; b.classList.remove("busy"); }
    });
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // the token is in this URL: never cache the page, and never send it in a Referer to
      // another site. "same-origin" (not "no-referrer", which makes browsers send
      // "Origin: null" on this page's own POST) is enough: the page has no
      // cross-origin links or resources.
      "cache-control": "no-store",
      "referrer-policy": "same-origin",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export async function POST(request: Request) {
  // 303: the browser follows a POST's redirect with a GET. Every refusal logs a reason
  // code (never the token or the address) so a failure in production can be told apart.
  const fail = (reason: string, detail?: string) => {
    console.error(`[auth/confirm] ${reason}${detail ? `: ${detail}` : ""}`);
    return NextResponse.redirect(new URL("/login?error=link", request.url), 303);
  };

  // Only this site's own Continue button may spend a token: a form on another site that
  // POSTs here is refused untouched. A same-origin POST is recognised by Sec-Fetch-Site,
  // or by an Origin equal to this site's; Origin "null" or any other origin is refused.
  const origin = request.headers.get("origin");
  const sameOrigin =
    request.headers.get("sec-fetch-site") === "same-origin" ||
    (origin !== null && origin === new URL(request.url).origin);
  if (!sameOrigin) return fail("origin_refused", `origin=${origin ?? "none"}, sec-fetch-site=${request.headers.get("sec-fetch-site") ?? "none"}`);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("bad_params", "unreadable form body");
  }
  const tokenHash = form.get("token_hash");
  const type = form.get("type");
  const next = safeNext(typeof form.get("next") === "string" ? (form.get("next") as string) : null);
  if (typeof tokenHash !== "string" || !tokenHash) return fail("bad_params", "missing token_hash");
  if (type !== "email") return fail("bad_params", "type is not email");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) return fail("verify_error", error.message);

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  // A first sign-in on a new device opens the dashboard in the business's language: the
  // language from the email is stored only when no choice is stored yet (same cookie and
  // options as the site's own language switch), and an existing choice is never overwritten.
  const lang = form.get("lang");
  if (typeof lang === "string" && isLocale(lang) && !/(?:^|;\s*)lmc_locale=/.test(request.headers.get("cookie") ?? "")) {
    response.cookies.set("lmc_locale", lang, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  }
  return response;
}
