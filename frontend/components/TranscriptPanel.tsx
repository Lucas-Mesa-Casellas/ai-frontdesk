"use client";

import { useState } from "react";
import { translateTranscript } from "@/lib/translate-actions";
import { IconGlobe } from "./icons";
import TranscriptView from "./ui/TranscriptView";

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

  // .cd-head / .cd-title / .cd-body are the call detail page's shared block
  // styles (defined in that page), so both transcript branches look the same.
  return (
    <div>
      <div className="cd-head">
        <h2 className="cd-title">{titleLabel}</h2>
        {translated ? (
          <button onClick={() => setShowingTranslated((v) => !v)} className="ui-btn ui-btn--secondary ui-btn--sm">
            <IconGlobe width={13} height={13} />
            {showingTranslated ? showOriginalLabel : showTranslatedLabel}
          </button>
        ) : (
          <button onClick={handleTranslate} disabled={loading} className="ui-btn ui-btn--secondary ui-btn--sm">
            <IconGlobe width={13} height={13} />
            {loading ? translatingLabel : translateLabel}
          </button>
        )}
      </div>
      {failed && <p className="cd-error">{errorLabel}</p>}
      <div className="cd-body cd-scroll">
        <TranscriptView text={displayedText} />
      </div>
    </div>
  );
}
