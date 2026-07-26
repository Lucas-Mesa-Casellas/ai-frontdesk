"use client";

import { useState, useRef, useEffect } from "react";
import { setDashLocale } from "@/lib/dash-actions";
import type { Locale } from "@/lib/locale";
import { IconGlobe } from "./icons";

const LANGS: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
];

export default function LangSwitcher({ current, path }: { current: Locale; path: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12.5, fontWeight: 500, color: "var(--text-2)",
          padding: "7px 11px", borderRadius: 999,
          border: "1px solid var(--hair)", background: "rgba(255,255,255,.03)",
          cursor: "pointer",
        }}
      >
        <IconGlobe width={13} height={13} />
        {current.toUpperCase()}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
            background: "rgba(16,19,25,.97)", border: "1px solid var(--hair-2)",
            borderRadius: 12, padding: 6, minWidth: 140,
            boxShadow: "0 24px 50px -20px rgba(0,0,0,.8)",
          }}
        >
          {LANGS.map((l) => (
            <form key={l.code} action={setDashLocale} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="locale" value={l.code} />
              <input type="hidden" name="path" value={path} />
              <button
                type="submit"
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 10px", borderRadius: 8, fontSize: 13.5,
                  color: current === l.code ? "var(--jade)" : "var(--text-2)",
                  background: current === l.code ? "rgba(55,226,155,.08)" : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                {l.name}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
