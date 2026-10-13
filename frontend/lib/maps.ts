// A Google Maps search for a visit address, opened from the dashboard ("Open in Maps").
//
// The address is only what the caller said ("14 rue des Lilas, Lyon"), often with no
// country, so Maps may pick a namesake elsewhere (a Zaragoza in Colombia, a Calle Mayor
// in another country). The business's own country is added to the search to pin it down,
// unless the address already names it.
const COUNTRY_NAMES: Record<string, string> = {
  ES: "Spain", FR: "France", GB: "United Kingdom", PT: "Portugal", IT: "Italy",
  DE: "Germany", BE: "Belgium", NL: "Netherlands", CH: "Switzerland", IE: "Ireland",
};
// other ways the caller (or the model) might already have written the country
const COUNTRY_ALIASES: Record<string, string[]> = {
  ES: ["spain", "espana", "españa"], FR: ["france"], GB: ["united kingdom", "uk", "england", "scotland", "wales"],
  PT: ["portugal"], IT: ["italy", "italia"], DE: ["germany", "deutschland", "allemagne", "alemania"],
  BE: ["belgium", "belgique", "belgica", "bélgica"], NL: ["netherlands", "nederland", "pays-bas"],
  CH: ["switzerland", "suisse", "schweiz", "suiza"], IE: ["ireland", "irlande", "irlanda"],
};

export function mapsQuery(address: string, country?: string | null): string {
  const code = (country || "").trim().toUpperCase();
  const name = COUNTRY_NAMES[code];
  if (!name) return address;
  const lower = address.toLowerCase();
  const named = (COUNTRY_ALIASES[code] ?? [name.toLowerCase()]).some((w) => new RegExp(`(^|[^a-zà-ÿ])${w}([^a-zà-ÿ]|$)`).test(lower));
  return named ? address : `${address}, ${name}`;
}

export function mapsUrl(address: string, country?: string | null): string {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapsQuery(address, country));
}
