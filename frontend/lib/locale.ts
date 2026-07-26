import { cookies } from "next/headers";

export type Locale = "en" | "es" | "fr";
const LOCALES: Locale[] = ["en", "es", "fr"];

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get("lmc_locale")?.value;
  return (LOCALES as string[]).includes(raw ?? "") ? (raw as Locale) : "en";
}
