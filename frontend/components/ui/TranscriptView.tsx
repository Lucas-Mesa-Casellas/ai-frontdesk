// Renders a transcript's text as readable messages. Purely presentational: it
// only splits the string it is given into lines and, where a line starts with
// a recognisable speaker label ("Agent:", "Caller:" ...), shows that label as
// a small tag and tints the message by who is speaking. The wording is never
// changed, translated or dropped, and a line with no label is shown as-is.

const AGENT = /^(agent|assistant|ai|bot|agente|asistente|réceptionniste|receptionist)$/i;
const CALLER = /^(user|caller|customer|client|cliente|llamante|appelant|usuario)$/i;
const LINE = /^\s*([A-Za-zÀ-ÿ]{2,16})\s*:\s*(.*)$/;

export default function TranscriptView({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <div className="tv">
      {lines.map((line, i) => {
        const m = LINE.exec(line);
        const who = m && (AGENT.test(m[1]) ? "agent" : CALLER.test(m[1]) ? "caller" : null);
        if (m && who) {
          return (
            <div key={i} className={`tv-msg tv-${who}`}>
              <span className="tv-who">{m[1]}</span>
              <p>{m[2]}</p>
            </div>
          );
        }
        return <p key={i} className="tv-line">{line}</p>;
      })}

      <style>{`
        .tv { display: flex; flex-direction: column; gap: 10px; }
        .tv-msg { max-width: 88%; padding: 11px 14px 12px; border-radius: 14px; border: 1px solid var(--border); background: rgba(255,255,255,.03); }
        .tv-msg p { font-size: 13.5px; line-height: 1.6; color: var(--text-2); }
        .tv-who { display: block; margin-bottom: 4px; font-size: 10.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--text-3); }
        /* the AI receptionist speaks from the left with a faint jade tint;
           the caller answers from the right, neutral */
        .tv-agent { align-self: flex-start; border-top-left-radius: 5px; background: rgba(55,226,155,.05); border-color: rgba(55,226,155,.16); }
        .tv-agent .tv-who { color: var(--jade); }
        .tv-caller { align-self: flex-end; border-top-right-radius: 5px; }
        .tv-line { font-size: 13.5px; line-height: 1.6; color: var(--text-2); }
        @media (max-width: 560px) { .tv-msg { max-width: 96%; } }
      `}</style>
    </div>
  );
}
