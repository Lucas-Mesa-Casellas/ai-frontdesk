"use client";

import { useState } from "react";
import { translateTranscript } from "@/lib/translate-actions";
import { IconGlobe } from "./icons";

// Only rendered by the call detail page when the dashboard locale differs
// from the business's own language -- when they match, the page renders
// the transcript directly with no button/wrapper at all, unchanged.
//
// A transcript is a literal record of what was said, so unlike
// summary/notes/next_action (Mode A, automatic) it is NEVER translated
// without an explicit click, and the original is never hidden -- once
// translated, a toggle switches between the two, defaulting to the
// translation (the reason the user clicked in the first place) but the
// original stays one click away for as long as the page is open.
export default function TranscriptPanel({
  callId, locale, originalTranscript, cachedTranslation,
  titleLabel, translateLabel, translatingLabel, showOriginalLabel, showTranslatedLabel, errorLabel,
}: {
  callId: string;
  locale: string;
  originalTranscript: string;
  cachedTranslation: string | null;
  titleLabel: string;
  translateLabel: string;
  translatingLabel: string;
  showOriginalLabel: string;
  showTranslatedLabel: string;
  errorLabel: string;
}) {
  const [translated, setTranslated] = useState<string | null>(cachedTranslation);
  const [showingTranslated, setShowingTranslated] = useState(!!cachedTranslation);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleTranslate = () => {
    setLoading(true);
    setFailed(false);
    translateTranscript(callId, locale)
      .then((result) => {
        setTranslated(result);
        setShowingTranslated(true);
      })
      .catch((err) => {
        console.error("[TranscriptPanel] transcript translation failed for call", callId, err);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  };

  const displayedText = showingTranslated && translated ? translated : originalTranscript;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600 }}>{titleLabel}</h2>
        {translated ? (
          <button
            onClick={() => setShowingTranslated((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text-2)",
              padding: "6px 11px", borderRadius: 8, border: "1px solid var(--hair)", background: "transparent", cursor: "pointer",
            }}
          >
            <IconGlobe width={12} height={12} />
            {showingTranslated ? showOriginalLabel : showTranslatedLabel}
          </button>
        ) : (
          <button
            onClick={handleTranslate}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--text-2)",
              padding: "6px 11px", borderRadius: 8, border: "1px solid var(--hair)", background: "transparent",
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
            }}
          >
            <IconGlobe width={12} height={12} />
            {loading ? translatingLabel : translateLabel}
          </button>
        )}
      </div>
      {failed && <p style={{ fontSize: 12, color: "#E5877B", marginBottom: 8 }}>{errorLabel}</p>}
      <div style={{
        padding: 14, borderRadius: 12, background: "rgba(255,255,255,.028)", border: "1px solid rgba(255,255,255,.04)",
        fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, maxHeight: 340, overflowY: "auto",
      }}>
        {displayedText.split("\n").map((line, i) => (
          <p key={i} style={{ marginBottom: 8 }}>{line}</p>
        ))}
      </div>
    </div>
  );
}
