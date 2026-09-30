// A call length as m:ss ("4:07"; "12:03"). Null or missing durations (older
// calls, or a call whose start/end timestamps never arrived) show nothing
// rather than a made-up 0:00.
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
