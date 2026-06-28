/**
 * Estimated one-rep max using the Epley formula.
 * 1RM = weight * (1 + reps / 30)
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export interface PersonalRecord {
  name: string;
  /** Heaviest completed weight (kg). */
  maxWeight: number;
  /** Best estimated 1RM (kg). */
  bestOneRepMax: number;
  /** Reps achieved at the heaviest weight. */
  repsAtMax: number;
}

interface RecordLog {
  name: string;
  weight: number;
  reps: number;
}

/**
 * Reduce completed set logs to a personal record per exercise.
 */
export function computePersonalRecords(logs: RecordLog[]): PersonalRecord[] {
  const byName = new Map<string, PersonalRecord>();

  for (const log of logs) {
    if (log.weight <= 0) continue;
    const orm = estimateOneRepMax(log.weight, log.reps);
    const existing = byName.get(log.name);
    if (!existing) {
      byName.set(log.name, {
        name: log.name,
        maxWeight: log.weight,
        bestOneRepMax: orm,
        repsAtMax: log.reps,
      });
      continue;
    }
    if (log.weight > existing.maxWeight) {
      existing.maxWeight = log.weight;
      existing.repsAtMax = log.reps;
    }
    if (orm > existing.bestOneRepMax) existing.bestOneRepMax = orm;
  }

  return Array.from(byName.values()).sort(
    (a, b) => b.bestOneRepMax - a.bestOneRepMax,
  );
}
