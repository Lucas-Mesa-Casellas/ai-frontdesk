import OpenAI from "openai";

// Server-only (never imported by a "use client" file): reads OPENAI_API_KEY
// directly, same as backend/app/services/ai.py reads settings.openai_api_key.
// This is a SEPARATE key/setup from the backend's -- the backend's Python
// process and this Next.js server run as two different deployments
// (Railway/Vercel), so OPENAI_API_KEY must also be configured here, in the
// frontend project's own environment.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANGUAGE_NAMES: Record<string, string> = { es: "Spanish", fr: "French", en: "English" };

// Mode A: translate one or more short free-text fields (summary/notes/
// next_action) in a single call. Mirrors ai.py's extract_call_data pattern
// -- same model, temperature 0 for determinism, a system prompt demanding
// ONLY a JSON object back, parsed the same way (JSON.parse, no markdown/
// code-fence tolerance).
export async function translateFields(
  fields: Record<string, string>,
  targetLocale: string
): Promise<Record<string, string>> {
  const languageName = LANGUAGE_NAMES[targetLocale] ?? targetLocale;
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `You are a precise translation assistant for a business call-summary system. Translate every value in the JSON object you are given into ${languageName}. Return ONLY a valid JSON object with the exact same keys, each value replaced by its translation into ${languageName}. Preserve tone and meaning. Do not add commentary, notes, explanations, markdown, or code fences -- JSON only.`,
      },
      { role: "user", content: JSON.stringify(fields) },
    ],
  });
  const raw = response.choices[0].message.content ?? "{}";
  return JSON.parse(raw);
}

// Mode B: translate a multi-turn call transcript while explicitly
// preserving its turn structure -- each line is "Speaker: what they
// said"; only the spoken content after the label gets translated, the
// label and line breaks stay exactly as they are. Plain-text response,
// not JSON, since this is prose, not structured fields.
export async function translateTranscriptText(transcript: string, targetLocale: string): Promise<string> {
  const languageName = LANGUAGE_NAMES[targetLocale] ?? targetLocale;
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 4000,
    messages: [
      {
        role: "system",
        content: `You are a precise translation assistant. The following is a multi-turn phone call transcript. Each line begins with a speaker label (e.g. "Agent:" or "User:") followed by what that speaker said. Translate ONLY the spoken content after each label into ${languageName}. Keep every speaker label exactly as it is -- do not translate, rename, reformat, or alter "Agent"/"User"/etc. or the colon after it. Preserve the exact same number of lines in the exact same order: one translated line per original line, nothing merged, split, added, or removed. Return ONLY the translated transcript text in that same line format. No commentary, no markdown, no code fences.`,
      },
      { role: "user", content: transcript },
    ],
  });
  return response.choices[0].message.content ?? transcript;
}
