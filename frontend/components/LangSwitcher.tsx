"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { setDashLocale } from "@/lib/dash-actions";
import type { Locale } from "@/lib/locale";
import { IconGlobe } from "./icons";

const ORDER: Locale[] = ["en", "es", "fr"];
const NAMES: Record<Locale, string> = { en: "English", es: "Español", fr: "Français" };

export default function LangSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuList, setMenuList] = useState<Locale[]>(ORDER);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  async function pickLang(code: Locale) {
    const want: Locale[] = [code, ...ORDER.filter((c) => c !== code)];
    const menu = menuRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fd = new FormData();
    fd.set("locale", code);
    fd.set("path", pathname);

    if (!menu || reduce || want.join() === menuList.join()) {
      setMenuList(want);
      setOpen(false);
      await setDashLocale(fd);
      return;
    }

    const items = Array.from(menu.children) as HTMLElement[];
    const first = new Map(items.map((el) => [el.dataset.l as string, el.getBoundingClientRect().top]));
    setMenuList(want);

    requestAnimationFrame(() => {
      const now = Array.from(menu.children) as HTMLElement[];
      now.forEach((el) => {
        const prev = first.get(el.dataset.l as string);
        if (prev === undefined) return;
        const delta = prev - el.getBoundingClientRect().top;
        if (!delta) return;
        el.classList.remove("flip");
        el.style.transform = `translateY(${delta}px)`;
      });
      requestAnimationFrame(() => {
        now.forEach((el) => { el.classList.add("flip"); el.style.transform = ""; });
      });
      setTimeout(() => setOpen(false), 470);
    });

    await setDashLocale(fd);
  }

  return (
    <div ref={ref} className="lang">
      <button
        className="lang-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Change language"
        onClick={() => setOpen((o) => !o)}
      >
        <IconGlobe width={13} height={13} className="globe" />
        <span>{current.toUpperCase()}</span>
        <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      <div ref={menuRef} className={`lang-menu${open ? " open" : ""}`} role="listbox" aria-label="Language">
        {menuList.map((code) => (
          <button
            key={code}
            data-l={code}
            role="option"
            aria-selected={current === code}
            onClick={() => pickLang(code)}
          >
            <span className="code">{code.toUpperCase()}</span>
            {NAMES[code]}
            <svg className="mark" viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
