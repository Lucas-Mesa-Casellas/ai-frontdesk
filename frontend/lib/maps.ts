// A Google Maps search for a visit address, opened from the dashboard ("Open in Maps").
export function mapsUrl(address: string): string {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address);
}
