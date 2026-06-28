/**
 * Rule-based insight engine for Meridian.
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
 * Rule 1 — Volume trend.
 * If avg volume of last 14 days is >10% below the previous 14 days → negative.
 */
export function volumeTrendInsight(sessions: SessionSummary[]): Insight | null {
  if (sessions.length < 4) return null;

  const now = Date.now();
  const day = 86_400_000;
  const recent: number[] = [];
  const prior: number[] = [];

  for (const s of sessions) {
    const ageDays = (now - new Date(s.date).getTime()) / day;
    if (ageDays <= 14) recent.push(s.volume);
    else if (ageDays <= 28) prior.push(s.volume);
  }

  if (recent.length === 0 || prior.length === 0) return null;

  const recentAvg = avg(recent);
  const priorAvg = avg(prior);
  if (priorAvg === 0) return null;

  const change = (recentAvg - priorAvg) / priorAvg;
  if (change < -0.1) {
    const pct = Math.round(Math.abs(change) * 100);
    return {
      id: "volume-trend",
      type: "negative",
      messageKey: "volumeTrend",
      params: { pct },
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
 * Rule 4 — Streak.
 * If the last 5 sessions were all completed → positive.
 */
export function streakInsight(sessions: SessionSummary[]): Insight | null {
  const last5 = sessions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);
  if (last5.length < 5) return null;
  if (last5.every((s) => s.completed)) {
    return {
      id: "streak",
      type: "positive",
      messageKey: "streak",
    };
  }
  return null;
}

/** Run every rule and collect the insights that fire. */
export function generateInsights(input: {
  sessions: SessionSummary[];
  history: ExerciseHistory[];
}): Insight[] {
  const results = [
    streakInsight(input.sessions),
    volumeTrendInsight(input.sessions),
    missedSetsInsight(input.sessions),
    stalledExerciseInsight(input.history),
  ];
  return results.filter((i): i is Insight => i !== null);
}
