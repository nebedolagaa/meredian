import type { WeightUnit } from "@/lib/types/database";

export type { WeightUnit };

/** Kilograms in one pound. */
export const KG_PER_LB = 0.45359237;

/**
 * Convert a stored weight (always kilograms) into the user's display unit.
 * Rounded to one decimal place.
 */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const value = unit === "lb" ? kg / KG_PER_LB : kg;
  return Math.round(value * 10) / 10;
}

/**
 * Convert a value entered in the user's display unit back to kilograms.
 */
export function toKg(value: number, unit: WeightUnit): number {
  const kg = unit === "lb" ? value * KG_PER_LB : value;
  return Math.round(kg * 100) / 100;
}

/** Short label for the unit (e.g. "kg", "lb"). */
export function unitLabel(unit: WeightUnit): string {
  return unit === "lb" ? "lb" : "kg";
}

/**
 * Format a kg-based volume figure in the user's unit, compactly (e.g. 12.4k).
 */
export function formatVolume(volumeKg: number, unit: WeightUnit): string {
  const v = unit === "lb" ? volumeKg / KG_PER_LB : volumeKg;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}
