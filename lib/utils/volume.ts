import type { SessionLog } from "@/lib/types/database";

/**
 * Volume for a single set = reps * weight.
 */
export function setVolume(reps: number | null, weight: number | null): number {
  if (!reps || !weight) return 0;
  return reps * weight;
}

/**
 * Total actual volume across a list of session logs.
 * volume = sum(actual_reps * actual_weight) for completed sets.
 */
export function totalVolume(
  logs: Pick<SessionLog, "actual_reps" | "actual_weight" | "completed">[],
): number {
  return logs.reduce((sum, log) => {
    if (!log.completed) return sum;
    return sum + setVolume(log.actual_reps, log.actual_weight);
  }, 0);
}

/**
 * Planned volume = target_sets * target_reps * target_weight.
 */
export function plannedVolume(
  exercises: {
    target_sets: number;
    target_reps: number;
    target_weight: number;
  }[],
): number {
  return exercises.reduce(
    (sum, e) => sum + e.target_sets * e.target_reps * e.target_weight,
    0,
  );
}

/**
 * Format a volume number compactly (e.g. 12.4k).
 */
export function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}
