/**
 * POST /api/support
 *
 * Receives the dashboard's support form (components/SupportForm.tsx).
 * Same approach as /api/contact: no npm dependency, Resend over HTTPS with
 * the shared RESEND_API_KEY, sent from the verified lmcagents.app domain.
 * Unlike /api/contact, the sender is an already-authenticated client, so
 * name/email/business come from their session, never from the request body.
 *
 * Recipient: SUPPORT_NOTIFY_EMAIL, falling back to SUPPORT_FALLBACK_EMAIL.
 * The intended inbox is admin@lmcagents.app, but that address is not yet
 * confirmed to receive mail (lmcagents.app mail runs through ImprovMX, and
 * /api/contact's own header notes admin@ "does NOT exist yet"). Once the
 * alias is confirmed, set SUPPORT_NOTIFY_EMAIL=admin@lmcagents.app on Vercel
 * -- no code change needed.
 *
 * Attachment limits: Resend allows 40MB per email (after base64), but the
 * binding limit here is Vercel's ~4.5MB request body cap on serverless
 * functions, so the cap is 4MB of files in total (leaving room for the
 * message and multipart overhead). Files are checked for type and content
 * signature, not just the filename.
 *
 * Required Vercel env vars:
 *   RESEND_API_KEY        - same key as /api/contact
 *   SUPPORT_NOTIFY_EMAIL  - optional override for the recipient
 */
import { getAuthedBusiness } from "@/lib/dashboard-data";

const FROM = "LMC Agents Support <web@lmcagents.app>";
const SUPPORT_FALLBACK_EMAIL = "lucasmesacas@gmail.com";

const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 4_000_000;
const MAX_MESSAGE_CHARS = 5000;

// 5 requests / 10 min per user. In-memory like /api/contact, so it resets on
// cold start -- enough to stop a scripted loop, which is the actual threat.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

// SVG deliberately excluded (can carry script).
const ALLOWED: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
};

function matchesSignature(type: string, b: Uint8Array): boolean {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  switch (type) {
    case "image/png": return at(0, 0x89, 0x50, 0x4e, 0x47);
    case "image/jpeg": return at(0, 0xff, 0xd8, 0xff);
    case "image/gif": return at(0, 0x47, 0x49, 0x46, 0x38);
    case "image/webp": return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
    case "application/pdf": return at(0, 0x25, 0x50, 0x44, 0x46);
    default: return false;
  }
}

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

function safeFilename(name: string): string {
  return name.replace(/[\\/\0]/g, "_").replace(/[^\w.\- ()]/g, "_").slice(0, 100) || "attachment";
}

export async function POST(request: Request) {
  // Same-origin only: this route acts on the signed-in client's cookie.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { user, business } = await getAuthedBusiness();
  if (!user) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!business) return Response.json({ ok: false, error: "no_business" }, { status: 403 });

  if (isRateLimited(user.id)) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[support] missing RESEND_API_KEY");
    return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  }
  const to = process.env.SUPPORT_NOTIFY_EMAIL || SUPPORT_FALLBACK_EMAIL;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "bad_form" }, { status: 400 });
  }

  const message = String(form.get("message") ?? "").trim();
  if (!message) return Response.json({ ok: false, error: "missing_message" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json({ ok: false, error: "message_too_long" }, { status: 400 });
  }

  const files = form.getAll("attachments").filter((v): v is File => typeof v !== "string" && v.size > 0);
  if (files.length > MAX_FILES) {
    return Response.json({ ok: false, error: "too_many_files" }, { status: 400 });
  }
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) {
    return Response.json({ ok: false, error: "too_big" }, { status: 413 });
  }

  const attachments: { filename: string; content: string }[] = [];
  for (const f of files) {
    const exts = ALLOWED[f.type];
    const lower = f.name.toLowerCase();
    if (!exts || !exts.some((e) => lower.endsWith(e))) {
      return Response.json({ ok: false, error: "bad_type" }, { status: 400 });
    }
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (!matchesSignature(f.type, bytes)) {
      return Response.json({ ok: false, error: "bad_type" }, { status: 400 });
    }
    attachments.push({ filename: safeFilename(f.name), content: Buffer.from(bytes).toString("base64") });
  }

  const html = `<html lang="en"><body style="font-family:system-ui,-apple-system,sans-serif;color:#111">
    <h2 style="margin:0 0 16px">Support request — dashboard</h2>
    ${row("Business", business.name)}
    ${row("Business ID", business.id)}
    ${row("Client email (login)", user.email)}
    ${row("Notification email", business.notification_email)}
    ${row("Message", message)}
    ${row("Attachments", attachments.length ? attachments.map((a) => a.filename).join(", ") : "none")}
    <hr style="border:none;border-top:1px solid #ddd;margin:18px 0">
    <p style="color:#888;font-size:12px;margin:0">
      Business language: ${esc(business.language)} · ${esc(new Date().toISOString())}
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
        // Replying goes straight to the client who asked.
        reply_to: user.email,
        subject: `Support request — ${business.name}`,
        html,
        ...(attachments.length ? { attachments } : {}),
      }),
    });

    if (!res.ok) {
      console.error("[support] resend rejected", res.status, await res.text());
      return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("[support] resend request threw", err);
    return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
