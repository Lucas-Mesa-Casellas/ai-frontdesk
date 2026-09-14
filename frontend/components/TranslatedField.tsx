"use client";

import { useEffect, useState } from "react";
import { translateCallFields } from "@/lib/translate-actions";

// Only ever rendered when the dashboard locale differs from the business's
// own language AND nothing is cached for this field+locale yet -- see
// lib/translate-helpers.ts's resolveTranslatable, which the server-rendered
// caller already checked. Shows the canonical text immediately (never a
// blank/empty flash), fires the translation in the background, swaps in
// the result once it lands. Every later view of this same call+locale
// reads the cache written here and never renders this component at all --
// resolveTranslatable resolves straight to the cached text server-side.
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
    translateCallFields(callId, locale)
      .then((result) => {
        if (alive && result[field]) setText(result[field]);
      })
      .catch((err) => {
        console.error("[TranslatedField] translation failed for call", callId, field, err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, locale, field]);

  return (
    <span style={{ opacity: loading ? 0.75 : 1 }}>
      {text}
      {loading && <span aria-hidden style={{ marginLeft: 4, color: "var(--text-3)" }}>···</span>}
    </span>
  );
}
