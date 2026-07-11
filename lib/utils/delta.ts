export type DeltaDirection = "over" | "under" | "on-target";

export interface Delta {
  value: number; // signed difference (actual - target)
  direction: DeltaDirection;
}

export function computeDelta(actual: number | null, target: number): Delta {
  if (actual === null || actual === undefined) {
    return { value: 0, direction: "on-target" };
  }
  const value = actual - target;
  if (value > 0) return { value, direction: "over" };
  if (value < 0) return { value, direction: "under" };
  return { value: 0, direction: "on-target" };
}

/**
 * Format a signed delta for display, e.g. "+5kg", "-2 reps".
 */
export function formatDelta(delta: Delta, unit: string): string {
  const sign = delta.value > 0 ? "+" : "";
  return `${sign}${delta.value}${unit}`;
}

/**
 * Percentage difference of actual vs target. Positive = over.
 */
export function deltaPercent(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.round(((actual - target) / target) * 100);
}
