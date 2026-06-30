/**
 * Rule-based progressive-overload engine for Meridian.
 *
 * Given how an exercise went in the most recent completed session, recommend the
 * working weight for the next one. This is the deterministic core behind the
 * "AI coaching" roadmap item — pure and fully unit-testable, no DB access.
 */

export type ProgressionAction = "increase" | "hold" | "deload";

export interface ProgressionInput {
  /** Top working weight (kg) from the most recent completed session. */
  lastWeight: number | null;
  /** Reps achieved at that weight last time. */
  lastReps: number | null;
  /** RPE recorded last time (1-10), if any. */
  lastRpe: number | null;
  /** Planned target reps for the exercise. */
  targetReps: number;
  /** Weight step for progression (kg). Defaults to 2.5. */
  incrementKg?: number;
}

export interface ProgressionResult {
  action: ProgressionAction;
  /** Recommended working weight (kg) for the next session. */
  suggestedWeightKg: number;
  /** Change versus last time (kg); positive = heavier. */
  deltaKg: number;
  /** Key into the `progression` message namespace. */
  reasonKey: string;
}

const roundToStep = (kg: number, step: number) => Math.round(kg / step) * step;

/**
 * Recommend the next working weight from last session's performance.
 * Returns null when there is no prior data to base a recommendation on.
 */
export function recommendProgression(
  input: ProgressionInput,
): ProgressionResult | null {
  const { lastWeight, lastReps, lastRpe, targetReps } = input;
  if (lastWeight == null || lastWeight <= 0) return null;

  const step =
    input.incrementKg && input.incrementKg > 0 ? input.incrementKg : 2.5;
  const hitTarget = lastReps == null || lastReps >= targetReps;
  const veryHard = lastRpe != null && lastRpe >= 9;
  const easy = lastRpe != null && lastRpe <= 7;
  const wellShort =
    lastReps != null && targetReps > 0 && lastReps < targetReps * 0.7;

  // Deload when the last session was maximal effort or the sets collapsed.
  if (veryHard || wellShort) {
    const suggested = Math.max(step, roundToStep(lastWeight * 0.9, step));
    return {
      action: "deload",
      suggestedWeightKg: suggested,
      deltaKg: +(suggested - lastWeight).toFixed(2),
      reasonKey: wellShort ? "deloadMissed" : "deloadHard",
    };
  }

  // Increase when every target rep was met and the effort was not maximal.
  if (hitTarget) {
    const suggested = roundToStep(lastWeight + step, step);
    return {
      action: "increase",
      suggestedWeightKg: suggested,
      deltaKg: +(suggested - lastWeight).toFixed(2),
      reasonKey: easy ? "increaseEasy" : "increaseHit",
    };
  }

  // Otherwise repeat the same weight and aim to add reps next time.
  return {
    action: "hold",
    suggestedWeightKg: lastWeight,
    deltaKg: 0,
    reasonKey: "hold",
  };
}
