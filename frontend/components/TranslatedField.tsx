"use client";

import { useEffect, useState } from "react";
import { translateCallsFields } from "@/lib/translate-actions";

type Fields = Record<string, string>;

// Every TranslatedField mounted in the same render (a whole calls list, the
// overview's latest calls, a calendar day) is gathered into ONE server
// action instead of one each: Next.js runs Server Actions one at a time per
// tab, so separate requests used to translate row after row, and a click on
// "Translate transcript" waited behind all of them. Results are kept for the
// life of the tab, so a re-render (AutoRefresh, switching calendar days)
// never asks twice for the same call.
const results = new Map<string, Promise<Fields | null>>();
let queue: { locale: string; callId: string; resolve: (f: Fields | null) => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const batch = queue;
  queue = [];
  const byLocale = new Map<string, typeof batch>();
  batch.forEach((q) => byLocale.set(q.locale, [...(byLocale.get(q.locale) ?? []), q]));
  byLocale.forEach((items, locale) => {
    translateCallsFields(items.map((q) => q.callId), locale)
      .then((res) => items.forEach((q) => {
        const f = res[q.callId] ?? null;
        if (!f) results.delete(`${locale}:${q.callId}`); // failed: a later mount may retry
        q.resolve(f);
      }))
      .catch((err) => {
        console.error("[TranslatedField] translation failed", err);
        items.forEach((q) => { results.delete(`${locale}:${q.callId}`); q.resolve(null); });
      });
  });
}

function requestTranslation(callId: string, locale: string): Promise<Fields | null> {
  const key = `${locale}:${callId}`;
  let p = results.get(key);
  if (!p) {
    p = new Promise<Fields | null>((resolve) => {
      queue.push({ locale, callId, resolve });
      if (!timer) timer = setTimeout(flush, 0);
    });
    results.set(key, p);
  }
  return p;
}

// Only ever rendered when the dashboard locale differs from the business's
// own language AND nothing is cached for this field+locale yet -- see
// lib/translate-helpers.ts's resolveTranslatable, which the server-rendered
// caller already checked. Shows the canonical text immediately (never a
// blank/empty flash), fires the translation in the background, swaps in
// the result once it lands. Every later view of this same call+locale
// reads the cache written by the action and never renders this component.
export default function TranslatedField({
  callId, locale, field, initialText,
}: {
  callId: string;
  locale: string;
  field: "summary" | "notes" | "next_action";
  initialText: string;
}) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    requestTranslation(callId, locale).then((result) => {
      if (!alive) return;
      if (result?.[field]) setText(result[field]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [callId, locale, field]);

  return (
    <span style={{ opacity: loading ? 0.75 : 1, transition: "opacity .25s" }}>
      {text}
      {loading && <span aria-hidden style={{ marginLeft: 4, color: "var(--text-3)" }}>···</span>}
    </span>
  );
}
