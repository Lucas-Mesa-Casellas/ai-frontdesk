// Pure, side-effect-free -- usable from either a server or client component,
// no "use server"/"use client" directive needed. Decides what to show for a
// translatable field WITHOUT touching the network: same-language business is
// the zero-cost path (show canonical, done); a different locale checks the
// cache first and only asks the caller to kick off a live translation
// (needsFetch) when nothing's cached yet.
export function resolveTranslatable(
  canonical: string | null | undefined,
  translations: Record<string, Record<string, string>> | null | undefined,
  field: string,
  locale: string,
  businessLanguage: string
): { text: string | null; needsFetch: boolean } {
  if (!canonical) return { text: null, needsFetch: false };
  if (locale === businessLanguage) return { text: canonical, needsFetch: false };
  const cached = translations?.[locale]?.[field];
  if (cached) return { text: cached, needsFetch: false };
  // Show the canonical text as the placeholder while a translation is
  // fetched in the background -- never an empty/blank flash.
  return { text: canonical, needsFetch: true };
}
