/**
 * Weekly-goal streak engine for Meridian.
 *
 * A "week" (Monday-based) counts toward the streak when the number of completed
 * sessions inside it meets the user's weekly goal. The current, in-progress week
 * is treated as a grace period — it never breaks an existing streak, it only
 * extends it once the goal has actually been met.
 *
 * Pure + deterministic (UTC week math) so it is trivially unit-testable.
 */

export interface StreakResult {
  /** Consecutive goal-meeting weeks ending at (or just before) the current week. */
  current: number;
  /** Longest run of consecutive goal-meeting weeks across all history. */
  longest: number;
  /** Completed sessions logged in the current week. */
  thisWeekCount: number;
  /** The weekly session goal used for the computation. */
  goal: number;
  /** Whether the current week already meets the goal. */
  metThisWeek: boolean;
}

/**
 * Monday-based week index for an ISO date (YYYY-MM-DD).
 *
 * Computed in UTC so the result is stable regardless of the runtime timezone,
 * which keeps the streak math deterministic and testable.
 */
export function weekIndex(iso: string): number {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) return 0;
  const days = Math.floor(ms / 86_400_000);
  // 1970-01-01 was a Thursday; +3 shifts the boundary so weeks start on Monday.
  return Math.floor((days + 3) / 7);
}

/**
 * Compute the weekly-goal streak from a list of completed session dates.
 *
 * @param completedDates ISO dates (YYYY-MM-DD) of completed sessions, any order.
 * @param goal           Sessions required per week to keep the streak alive.
 * @param todayISO       Today's ISO date, used to locate the current week.
 */
export function computeStreak(
  completedDates: string[],
  goal: number,
  todayISO: string,
): StreakResult {
  const g = Math.max(1, Math.round(goal) || 1);

  const countByWeek = new Map<number, number>();
  for (const date of completedDates) {
    if (!date) continue;
    const w = weekIndex(date);
    countByWeek.set(w, (countByWeek.get(w) ?? 0) + 1);
  }

  const currentWeek = weekIndex(todayISO);
  const thisWeekCount = countByWeek.get(currentWeek) ?? 0;
  const metThisWeek = thisWeekCount >= g;

  // Current streak: walk back from the current week. If this week hasn't met the
  // goal yet it is a grace period, so we start counting from the previous week
  // instead of breaking the streak prematurely.
  let current = 0;
  let cursor = metThisWeek ? currentWeek : currentWeek - 1;
  while ((countByWeek.get(cursor) ?? 0) >= g) {
    current++;
    cursor--;
  }

  // Longest run of consecutive goal-meeting weeks anywhere in history.
  const metWeeks = Array.from(countByWeek.entries())
    .filter(([, count]) => count >= g)
    .map(([week]) => week)
    .sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const week of metWeeks) {
    run = prev !== null && week === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = week;
  }
  if (current > longest) longest = current;

  return { current, longest, thisWeekCount, goal: g, metThisWeek };
}
