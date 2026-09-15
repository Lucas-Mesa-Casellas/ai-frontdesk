"use server";

import { createClient } from "@/lib/supabase-server";
import { translateFields, translateTranscriptText } from "@/lib/translate";

type CallFieldTranslations = Record<string, string>;

// Mode A (automatic, for summary/notes/next_action). Called from a client
// component only when the dashboard locale differs from the business's own
// language AND nothing is cached yet for that locale -- see
// lib/translate-helpers.ts's resolveTranslatable, which decides that on the
// server before ever rendering a client component that could call this.
//
// RLS (calls' SELECT/UPDATE policies, see supabase/migrations/004 and 006)
// restricts both the read and the write below to the caller's own
// business -- this runs as the viewer's own authenticated session, not a
// service-role key, so a call belonging to someone else's business simply
// isn't reachable here.
export async function translateCallFields(
  callId: string,
  targetLocale: string
): Promise<CallFieldTranslations> {
  const supabase = await createClient();
  const { data: call, error } = await supabase
    .from("calls")
    .select("summary, notes, next_action, translations")
    .eq("id", callId)
    .single();
  if (error || !call) throw error ?? new Error("Call not found or not accessible");

  const translations: Record<string, CallFieldTranslations> = call.translations ?? {};
  const cached = translations[targetLocale] ?? {};

  // Translate whichever canonical fields exist and aren't already cached
  // for this locale, in one combined LLM call -- not one call per field.
  const toTranslate: CallFieldTranslations = {};
  (["summary", "notes", "next_action"] as const).forEach((field) => {
    const canonical = call[field] as string | null;
    if (canonical && !cached[field]) toTranslate[field] = canonical;
  });

  if (Object.keys(toTranslate).length === 0) {
    // Fully cached already -- e.g. a concurrent request for the same
    // call+locale beat this one to it. Nothing left to do.
    return cached;
  }

  const translated = await translateFields(toTranslate, targetLocale);
  const merged = { ...cached, ...translated };
  const nextTranslations = { ...translations, [targetLocale]: merged };

  // .select("id") + a 0-row check, not just checking `error` -- the same
  // silent-failure class of bug found and fixed for confirmBooking/
  // cancelBooking: an UPDATE that Postgres considers "successful" but
  // whose RLS USING clause matches nothing returns error: null, not an
  // error. Without this check, a still-broken policy would look like the
  // translation worked (correct text returned to the caller for this one
  // view) while silently never persisting -- re-translating from scratch,
  // burning an OpenAI call, on every single future view.
  const { data: updateData, error: updateError } = await supabase
    .from("calls")
    .update({ translations: nextTranslations })
    .eq("id", callId)
    .select("id");
  if (updateError) {
    console.error("[translateCallFields] update failed", { callId, targetLocale, updateError });
    throw updateError;
  }
  if (!updateData || updateData.length === 0) {
    console.error("[translateCallFields] update matched 0 rows (RLS likely filtered it)", { callId, targetLocale });
    throw new Error("Translation update matched no rows — check calls' UPDATE RLS policy / ownership.");
  }

  return merged;
}

// Mode B (manual, transcript only). Only ever invoked by the "Translate
// transcript" button -- never automatically, since a transcript is a
// literal record of what was said, not something to silently rewrite.
// Idempotent: if translations[targetLocale].transcript is already cached
// (e.g. the user clicks again after a page reload), returns it directly
// without calling the LLM again.
export async function translateTranscript(callId: string, targetLocale: string): Promise<string> {
  const supabase = await createClient();
  const { data: call, error } = await supabase
    .from("calls")
    .select("transcript, translations")
    .eq("id", callId)
    .single();
  if (error || !call) throw error ?? new Error("Call not found or not accessible");
  if (!call.transcript) throw new Error("This call has no transcript to translate.");

  const translations: Record<string, CallFieldTranslations> = call.translations ?? {};
  const cachedTranscript = translations[targetLocale]?.transcript;
  if (cachedTranscript) return cachedTranscript;

  const translatedTranscript = await translateTranscriptText(call.transcript, targetLocale);
  const nextTranslations = {
    ...translations,
    [targetLocale]: { ...(translations[targetLocale] ?? {}), transcript: translatedTranscript },
  };

  // Same 0-row check as translateCallFields above -- see its comment.
  const { data: updateData, error: updateError } = await supabase
    .from("calls")
    .update({ translations: nextTranslations })
    .eq("id", callId)
    .select("id");
  if (updateError) {
    console.error("[translateTranscript] update failed", { callId, targetLocale, updateError });
    throw updateError;
  }
  if (!updateData || updateData.length === 0) {
    console.error("[translateTranscript] update matched 0 rows (RLS likely filtered it)", { callId, targetLocale });
    throw new Error("Translation update matched no rows — check calls' UPDATE RLS policy / ownership.");
  }

  return translatedTranscript;
}
