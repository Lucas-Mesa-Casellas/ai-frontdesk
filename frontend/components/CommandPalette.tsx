"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { href: string; label: string };

/**
 * Cmd/Ctrl+K "jump to" palette for the dashboard: type to filter the pages,
 * arrows + Enter (or click) to go. The trigger button sits in the dashboard's
 * top bar so it's discoverable without knowing the shortcut.
 */
export default function CommandPalette({
  items, placeholder, empty, openLabel,
}: { items: Item[]; placeholder: string; empty: string; openLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [mac, setMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((i) => i.label.toLowerCase().includes(needle)) : items;
  }, [items, q]);

  useEffect(() => { setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  useEffect(() => { setIdx(0); }, [q]);

  function go(item: Item | undefined) {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (list.length ? (i + 1) % list.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (list.length ? (i - 1 + list.length) % list.length : 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(list[idx]); }
  }

  return (
    <>
      <button type="button" className="cmdk-trigger" onClick={() => setOpen(true)} aria-label={openLabel} aria-haspopup="dialog">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <span className="cmdk-trigger-text">{openLabel}</span>
        <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      {open && (
        <div className="cmdk-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="cmdk" role="dialog" aria-modal="true" aria-label={openLabel}>
            <input
              ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
              placeholder={placeholder} aria-label={placeholder} role="combobox" aria-expanded="true"
              aria-controls="cmdk-list" aria-activedescendant={list[idx] ? `cmdk-${idx}` : undefined}
              autoComplete="off" spellCheck={false}
            />
            <ul id="cmdk-list" role="listbox">
              {list.length === 0 && <li className="cmdk-empty">{empty}</li>}
              {list.map((it, i) => (
                <li
                  key={it.href} id={`cmdk-${i}`} role="option" aria-selected={i === idx}
                  className={i === idx ? "on" : undefined}
                  onMouseMove={() => setIdx(i)} onClick={() => go(it)}
                >
                  {it.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style>{`
        /* A compact command control: field-width, the shortcut tucked at the right. */
        .cmdk-trigger {
          display: inline-flex; align-items: center; gap: 9px; height: 40px; min-width: 250px; padding: 0 8px 0 13px;
          border-radius: var(--radius-control); font-size: 13px; color: var(--text-3);
          background: var(--surface); border: 1px solid var(--border);
          transition: color .2s var(--e-out), border-color .2s var(--e-out), background .2s var(--e-out);
        }
        .cmdk-trigger:hover { color: var(--text); border-color: var(--border-strong); background: var(--surface-2); }
        .cmdk-trigger kbd { margin-left: auto; font: inherit; font-size: 11px; padding: 3px 7px; border-radius: 7px; color: var(--text-3); border: 1px solid var(--border); background: rgba(255,255,255,.03); }
        @media (max-width: 700px) {
          .cmdk-trigger-text, .cmdk-trigger kbd { display: none; }
          .cmdk-trigger { min-width: 0; width: 40px; padding: 0; justify-content: center; }
        }
        .cmdk-scrim {
          position: fixed; inset: 0; z-index: 90; display: flex; justify-content: center; align-items: flex-start;
          padding: 14vh 16px 0; background: rgba(4,6,9,.62); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          animation: cmdkFade .16s var(--e-out);
        }
        .cmdk {
          width: min(520px, 100%); border-radius: 18px; overflow: hidden;
          background: linear-gradient(180deg, rgba(20,24,31,.98), rgba(13,16,21,.98));
          border: 1px solid var(--hair-2); box-shadow: 0 40px 90px -30px rgba(0,0,0,.95), 0 0 0 1px rgba(55,226,155,.06);
          animation: cmdkPop .18s var(--e-out);
        }
        .cmdk input {
          width: 100%; padding: 16px 18px; font: inherit; font-size: 15px; color: var(--text);
          background: none; border: 0; border-bottom: 1px solid var(--hair); outline: none;
        }
        .cmdk input::placeholder { color: var(--text-3); }
        .cmdk ul { list-style: none; padding: 8px; max-height: 320px; overflow-y: auto; }
        .cmdk li { padding: 11px 12px; border-radius: 10px; font-size: 14px; color: var(--text-2); cursor: pointer; }
        .cmdk li.on { background: rgba(55,226,155,.1); color: var(--jade); }
        .cmdk li.cmdk-empty { color: var(--text-3); cursor: default; }
        @keyframes cmdkFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmdkPop { from { opacity: 0; transform: translateY(-8px) scale(.985); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .cmdk-scrim, .cmdk { animation: none; } }
      `}</style>
    </>
  );
}
