/**
 * POST /api/contact
 *
 * Receives the landing-page contact form (app/page.tsx -> submit()).
 * Sends the lead to the founder's inbox via Resend's REST API.
 *
 * No npm dependency: we call Resend over HTTPS so the frontend bundle and
 * lockfile stay untouched. The backend uses the `resend` python package;
 * this is the same service, same verified domain (lmcagents.app).
 *
 * Required Vercel env vars:
 *   RESEND_API_KEY      - same key as Railway
 *   LEAD_NOTIFY_EMAIL   - where leads land. admin@/contact@lmcagents.app do
 *                         NOT exist yet, so this must be a real inbox.
 */

const FROM = "LMC Agents <web@lmcagents.app>";
const ALLOWED_ORIGINS = ["https://lmcagents.app", "https://www.lmcagents.app"];

// In-memory rate limit: 5 requests / 10 min per IP. Resets on cold start —
// not perfect on serverless, but stops basic scripted loops, which is the
// actual threat here.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return false;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Lead = {
  kind?: string;
  lang?: string;
  name?: string;
  business?: string;
  email?: string;
  phone?: string;
  message?: string;
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: unknown): string {
  return `<p style="margin:0 0 10px"><strong>${esc(label)}:</strong> ${esc(value) || "—"}</p>`;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  if (!ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;

  if (!apiKey || !to) {
    console.error("[contact] missing RESEND_API_KEY or LEAD_NOTIFY_EMAIL");
    return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  }

  let body: Lead;
  try {
    body = (await request.json()) as Lead;
  } catch {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const business = (body.business ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !business || !email || !phone) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (name.length > 200 || business.length > 200 || phone.length > 50 || message.length > 5000) {
    return Response.json({ ok: false, error: "field_too_long" }, { status: 400 });
  }

  const html = `<html lang="en"><body style="font-family:system-ui,-apple-system,sans-serif;color:#111">
    <h2 style="margin:0 0 16px">New lead — lmcagents.app</h2>
    ${row("Name", name)}
    ${row("Business", business)}
    ${row("Email", email)}
    ${row("Phone", phone)}
    ${row("Message", message)}
    <hr style="border:none;border-top:1px solid #ddd;margin:18px 0">
    <p style="color:#888;font-size:12px;margin:0">
      Form language: ${esc(body.lang)} · Kind: ${esc(body.kind)} · ${esc(new Date().toISOString())}
    </p>
  </body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: email,
        subject: `New lead — ${business} — ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      // Full body in the Vercel log so a silent Resend rejection is visible.
      console.error("[contact] resend rejected", res.status, await res.text());
      return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("[contact] resend request threw", err);
    return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
