"use client";

import { useRef, useState } from "react";

// Same look and same send-button states (idle / sending / sent / error) as
// the landing page's contact form -- .cta-card, .fld and .send come from
// globals.css. Only the fields differ: no name/email/business here, since
// the sender is already signed in and the API route reads those from the
// session.
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
    <div className="cta-card sup-card">
      <form onSubmit={submit}>
        <div className="fld">
          <label htmlFor="sup-msg">{labels.msgLabel}</label>
          <textarea
            id="sup-msg" name="message" required maxLength={5000}
            placeholder={labels.msgPh} style={{ minHeight: 140 }}
          />
        </div>

        <div className="fld">
          <label htmlFor="sup-files">{labels.attachLabel}</label>
          <input
            ref={inputRef} id="sup-files" type="file" multiple
            accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,image/png,image/jpeg,image/webp,image/gif,application/pdf"
            onChange={(e) => addFiles(e.target.files)}
            style={{ display: "none" }}
          />
          <button type="button" className="sup-attach" onClick={() => inputRef.current?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m20 11.2-8.3 8.3a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
            </svg>
            {labels.attachBtn}
          </button>
          <p className="sup-hint">{labels.attachHint}</p>
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

        <button
          className={`send${sendState === "sent" ? " ok" : ""}${sendState === "sending" ? " busy" : ""}${sendState === "error" ? " err" : ""}`}
          type="submit"
          disabled={sendState === "sending"}
        >
          <span className="spin" aria-hidden="true" />
          <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
          <span>
            {sendState === "sending" ? labels.sending
              : sendState === "sent" ? labels.sent
              : sendState === "error" ? labels.error
              : labels.send}
          </span>
        </button>

        {sendState === "sent" && <p className="sup-note ok" role="status">{labels.sentNote}</p>}
      </form>

      <style>{`
        /* contain: inline-size stops a long unbreakable attachment filename
           from stretching this card (and the whole flex column around it)
           past the viewport on a phone -- the name truncates instead. */
        .sup-card { max-width: 560px; contain: inline-size; }
        .sup-attach {
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          font-size: 13.5px; font-weight: 500; color: var(--text-2);
          padding: 10px 16px; border-radius: var(--r-pill);
          background: rgba(255,255,255,.035); border: 1px solid var(--hair-2);
          transition: background .22s var(--e-out), color .22s var(--e-out), border-color .22s var(--e-out);
        }
        .sup-attach:hover { background: rgba(255,255,255,.075); color: var(--text); border-color: rgba(255,255,255,.2); }
        .sup-hint { margin-top: 8px; font-size: 12px; color: var(--text-3); }
        .sup-err { margin-top: 8px; font-size: 12.5px; color: #E5877B; }
        .sup-files { list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
        .sup-files li {
          display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 12px;
          border-radius: var(--r-md); background: rgba(255,255,255,.028); border: 1px solid var(--hair);
          font-size: 13px; color: var(--text-2);
        }
        .sup-fname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sup-fsize { flex: none; font-size: 11.5px; color: var(--text-3); }
        .sup-x {
          flex: none; width: 26px; height: 26px; border-radius: 8px; font-size: 17px; line-height: 1;
          color: var(--text-3); transition: background .18s var(--e-out), color .18s var(--e-out);
        }
        .sup-x:hover { background: rgba(255,255,255,.08); color: var(--text); }
        .sup-note { margin-top: 12px; text-align: center; font-size: 12.5px; color: var(--text-3); }
        .sup-note.ok { color: var(--jade); }
        @media (max-width: 560px) {
          .sup-attach { width: 100%; justify-content: center; padding: 12px 16px; }
          .sup-x { width: 34px; height: 34px; }
        }
      `}</style>
    </div>
  );
}
