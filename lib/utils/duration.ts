/** Workout duration helpers shared by the session runner and history. */

/**
 * Whole minutes between two ISO timestamps, or null when either side is
 * missing or the result is implausible (non-positive or over a day).
 */
export function durationMinutes(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): number | null {
  if (!startedAt || !endedAt) return null;
  const min = Math.round(
    (Date.parse(endedAt) - Date.parse(startedAt)) / 60000,
  );
  return min > 0 && min < 24 * 60 ? min : null;
}

/** "1:07" for 67 minutes, "45′" under an hour. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m}′`;
}
