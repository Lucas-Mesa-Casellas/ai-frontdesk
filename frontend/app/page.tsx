import { cookies } from "next/headers";
import Landing, { type LangCode } from "@/components/Landing";

const pick = (v: string | undefined): LangCode | null => {
  const c = v?.toLowerCase();
  return c === "en" ? "EN" : c === "es" ? "ES" : c === "fr" ? "FR" : null;
};

// The landing opens in the visitor's language: ?lang=fr|es|en first (proxy.ts
// also saves it), then the choice they made earlier with the language switcher
// (the same lmc_locale cookie the dashboard uses), and English for a first visit.
// Decided here, on the server, so the first paint is already in that language.
export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string | string[] }> }) {
  const sp = await searchParams;
  const fromUrl = pick(Array.isArray(sp.lang) ? sp.lang[0] : sp.lang);
  const fromCookie = pick((await cookies()).get("lmc_locale")?.value);
  return <Landing initialLang={fromUrl ?? fromCookie ?? "EN"} />;
}
