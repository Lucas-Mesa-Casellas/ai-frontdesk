"use client";

import { useRef, useState } from "react";
import Card from "./ui/Card";
import Field from "./ui/Field";

// The sender is already signed in, so there are no name/email/business fields:
// the API route reads those from the session. Only `message` and
// `attachments` are posted -- the contract with app/api/support/route.ts.
// Styling uses the shared ui-* classes (the landing page's contact form keeps
// its own), so changing one no longer changes the other.
const MAX_FILES = 3;
const MAX_TOTAL_BYTES = 4_000_000; // keep in sync with app/api/support/route.ts
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

type SendState = "idle" | "sending" | "sent" | "error";

export type SupportLabels = {
  msgLabel: string; msgPh: string;
  attachLabel: string; attachBtn: string; attachHint: string; remove: string;
  send: string; sending: string; sent: string; sentNote: string; error: string;
  errTooBig: string; errType: string; errTooMany: string;
};

function formatSize(bytes: number) {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export default function SupportForm({ labels }: { labels: SupportLabels }) {
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list || !list.length) return;
    const next = [...files, ...Array.from(list)];
    // Checked in order of what's easiest for the user to fix.
    if (next.some((f) => !ALLOWED_TYPES.includes(f.type))) return setFileError(labels.errType);
    if (next.length > MAX_FILES) return setFileError(labels.errTooMany);
    if (next.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return setFileError(labels.errTooBig);
    setFileError("");
    setFiles(next);
    // Lets the same file be picked again after removing it.
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sendState !== "idle") return;
    const form = e.currentTarget;
    const body = new FormData();
    body.set("message", (form.elements.namedItem("message") as HTMLTextAreaElement).value);
    files.forEach((f) => body.append("attachments", f));
    setSendState("sending");
    try {
      const res = await fetch("/api/support", { method: "POST", body });
      if (!res.ok) throw new Error(`support route responded ${res.status}`);
      setSendState("sent");
      form.reset();
      setFiles([]);
      setTimeout(() => setSendState("idle"), 6000);
    } catch (err) {
      // Input (and attachments) survive a failed send so it's one click to retry.
      console.error("[support] submit failed", err);
      setSendState("error");
      setTimeout(() => setSendState("idle"), 4200);
    }
  }

  return (
    <Card as="section" className="sup-card">
      <form onSubmit={submit}>
        <Field label={labels.msgLabel} htmlFor="sup-msg" className="sup-block">
          <textarea
            id="sup-msg" name="message" required maxLength={5000}
            placeholder={labels.msgPh} className="ui-input sup-msg"
          />
        </Field>

        <div className="sup-block">
          <label className="ui-label" htmlFor="sup-files">{labels.attachLabel}</label>
          <input
            ref={inputRef} id="sup-files" type="file" multiple
            accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
            onChange={(e) => addFiles(e.target.files)}
            style={{ display: "none" }}
          />
          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => inputRef.current?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m20 11.2-8.3 8.3a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
            </svg>
            {labels.attachBtn}
          </button>
          <p className="ui-hint">{labels.attachHint}</p>
          {fileError && <p className="sup-err" role="alert">{fileError}</p>}
          {files.length > 0 && (
            <ul className="sup-files">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <span className="sup-fname">{f.name}</span>
                  <span className="sup-fsize">{formatSize(f.size)}</span>
                  <button
                    type="button" className="sup-x" aria-label={`${labels.remove} ${f.name}`}
                    onClick={() => { setFiles(files.filter((_, k) => k !== i)); setFileError(""); }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sup-actions">
          <button
            className={`ui-btn ${sendState === "error" ? "ui-btn--warning" : "ui-btn--primary"} sup-send`}
            type="submit"
            disabled={sendState === "sending"}
          >
            {sendState === "sending" && <span className="sup-spin" aria-hidden="true" />}
            {sendState === "sent" && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
            )}
            <span>
              {sendState === "sending" ? labels.sending
                : sendState === "sent" ? labels.sent
                : sendState === "error" ? labels.error
                : labels.send}
            </span>
          </button>
          {sendState === "sent" && <p className="sup-note" role="status">{labels.sentNote}</p>}
        </div>
      </form>

      <style>{`
        /* contain: inline-size stops a long unbreakable attachment filename
           from stretching this card (and the whole flex column around it)
           past the viewport on a phone -- the name truncates instead. */
        .sup-card { padding: 30px; contain: inline-size; }
        .sup-card:hover { transform: none; }
        .sup-block { margin-bottom: 24px; }
        .sup-msg { min-height: 180px; font-size: 14.5px; padding: 15px 16px; }
        .sup-err { margin-top: 8px; font-size: 12.5px; color: #E5877B; }
        .sup-files { list-style: none; margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .sup-files li {
          display: flex; align-items: center; gap: 10px; padding: 9px 9px 9px 14px;
          border-radius: var(--radius-control); background: rgba(255,255,255,.028); border: 1px solid var(--border);
          font-size: 13px; color: var(--text-2);
        }
        .sup-fname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sup-fsize { flex: none; font-size: 11.5px; color: var(--text-3); }
        .sup-x {
          flex: none; width: 28px; height: 28px; border-radius: 8px; font-size: 17px; line-height: 1;
          color: var(--text-3); transition: background .18s var(--e-out), color .18s var(--e-out);
        }
        .sup-x:hover { background: rgba(255,255,255,.08); color: var(--text); }
        .sup-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding-top: 22px; border-top: 1px solid var(--border); }
        .sup-send { min-width: 170px; height: 44px; }
        .sup-spin {
          width: 15px; height: 15px; border-radius: 50%; flex: none;
          border: 2px solid rgba(4,20,13,.25); border-top-color: #04140D; animation: spin .7s linear infinite;
        }
        .sup-note { font-size: 13px; color: var(--text-2); }
        @media (max-width: 560px) {
          .sup-card { padding: 20px; }
          .sup-send { width: 100%; }
        }
      `}</style>
    </Card>
  );
}
