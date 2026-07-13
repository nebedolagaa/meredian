/**
 * Rule-based insight engine for Meredian.
 *
 * Pure functions over normalised session data. No DB access here —
 * callers assemble the input shape and render the resulting insights.
 */

export type InsightType = "positive" | "negative" | "neutral";

export interface Insight {
  id: string;
  type: InsightType;
  /** Key into the `insights` message namespace. */
  messageKey: string;
  /** ICU values for the message, if any. */
  params?: Record<string, string | number>;
}

/** One completed session reduced to the numbers the rules need. */
export interface SessionSummary {
  date: string; // ISO YYYY-MM-DD
  volume: number; // total actual volume
  progress: number; // actual/planned volume as a percentage (0-100+)
  plannedSets: number;
  completedSets: number;
  completed: boolean; // status === 'completed'
}

/** Per-exercise top set over time, used for stall/PR detection. */
export interface ExerciseHistory {
  name: string;
  /** Max actual weight per session, ordered oldest -> newest. */
  maxWeights: number[];
}

const avg = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Rule 1 — Progress trend.
 * Compares average plan-completion (%) of the last 14 days against the
 * previous 14 days. A drop of more than 8 percentage points → negative.
 */
export function progressTrendInsight(
  sessions: SessionSummary[],
): Insight | null {
  if (sessions.length < 4) return null;

  const now = Date.now();
  const day = 86_400_000;
  const recent: number[] = [];
  const prior: number[] = [];

  for (const s of sessions) {
    const ageDays = (now - new Date(s.date).getTime()) / day;
    if (ageDays <= 14) recent.push(s.progress);
    else if (ageDays <= 28) prior.push(s.progress);
  }

  if (recent.length === 0 || prior.length === 0) return null;

  const recentAvg = avg(recent);
  const priorAvg = avg(prior);

  const dropPoints = Math.round(priorAvg - recentAvg);
  if (dropPoints > 8) {
    return {
      id: "progress-trend",
      type: "negative",
      messageKey: "progressTrend",
      params: { pct: dropPoints },
    };
  }
  return null;
}

/**
 * Rule 2 — Stalled exercise.
 * If max weight for an exercise hasn't increased across the last 3 sessions → neutral.
 */
export function stalledExerciseInsight(
  history: ExerciseHistory[],
): Insight | null {
  for (const ex of history) {
    const last3 = ex.maxWeights.slice(-3);
    if (last3.length < 3) continue;
    const noProgress = last3[2] <= last3[0] && last3[1] <= last3[0];
    if (noProgress) {
      return {
        id: `stall-${ex.name}`,
        type: "neutral",
        messageKey: "stalled",
        params: { name: ex.name },
      };
    }
  }
  return null;
}

/**
 * Rule 3 — Missed sets pattern.
 * If completed/planned sets < 0.8 across the last 3 sessions → negative.
 */
export function missedSetsInsight(sessions: SessionSummary[]): Insight | null {
  const last3 = sessions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-3);
  if (last3.length < 3) return null;

  const planned = last3.reduce((s, x) => s + x.plannedSets, 0);
  const completed = last3.reduce((s, x) => s + x.completedSets, 0);
  if (planned === 0) return null;

  if (completed / planned < 0.8) {
    return {
      id: "missed-sets",
      type: "negative",
      messageKey: "missedSets",
    };
  }
  return null;
}

/**
 * Rule 4 — Weekly streak.
 * Surfaces an encouraging note once the user has strung together two or more
 * consecutive goal-meeting weeks. Driven by the streak engine (see streak.ts).
 */
export function weeklyStreakInsight(streakWeeks: number): Insight | null {
  if (streakWeeks < 2) return null;
  return {
    id: "streak",
    type: "positive",
    messageKey: "streak",
    params: { weeks: streakWeeks },
  };
}

/** Run every rule and collect the insights that fire. */
export function generateInsights(input: {
  sessions: SessionSummary[];
  history: ExerciseHistory[];
  streakWeeks?: number;
}): Insight[] {
  const results = [
    weeklyStreakInsight(input.streakWeeks ?? 0),
    progressTrendInsight(input.sessions),
    missedSetsInsight(input.sessions),
    stalledExerciseInsight(input.history),
  ];
  return results.filter((i): i is Insight => i !== null);
}
