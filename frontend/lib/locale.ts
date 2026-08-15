import { cookies } from "next/headers";
import { getAuthedBusiness } from "@/lib/dashboard-data";

export type Locale = "en" | "es" | "fr";
const LOCALES: Locale[] = ["en", "es", "fr"];

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get("lmc_locale")?.value;
  if ((LOCALES as string[]).includes(raw ?? "")) {
    return raw as Locale; // explicit user choice always wins
  }

  // No explicit choice yet -- default to the business's own language rather
  // than always English. getAuthedBusiness() is request-memoized, so calling
  // it here costs nothing extra even though pages also call it separately.
  const { business } = await getAuthedBusiness();
  const bizLang = business?.language;
  if ((LOCALES as string[]).includes(bizLang ?? "")) {
    return bizLang as Locale;
  }

  return "en";
}
