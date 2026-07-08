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

export interface RecordEvent {
  name: string;
  date: string;
  weight: number;
  reps: number;
  oneRepMax: number;
}

interface DatedRecordLog extends RecordLog {
  date: string;
}

/**
 * Walk logs oldest -> newest and emit an event each time a new best
 * estimated 1RM is reached for an exercise — a PR timeline derived from
 * data already on hand, no persisted history required.
 */
export function computeRecordTimeline(
  logs: DatedRecordLog[],
): RecordEvent[] {
  const bestByName = new Map<string, number>();
  const events: RecordEvent[] = [];

  for (const log of logs) {
    if (log.weight <= 0) continue;
    const orm = estimateOneRepMax(log.weight, log.reps);
    const best = bestByName.get(log.name) ?? 0;
    if (orm > best) {
      bestByName.set(log.name, orm);
      events.push({
        name: log.name,
        date: log.date,
        weight: log.weight,
        reps: log.reps,
        oneRepMax: orm,
      });
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}
