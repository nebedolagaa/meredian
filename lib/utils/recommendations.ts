import type { Sex, TrainingLevel } from "@/lib/types/database";

/**
 * Personalised starting-point recommendations for an exercise, derived from
 * the user's profile (body weight, height, sex, training level). These are
 * conservative working-set suggestions — not maxes — meant as a first target
 * that users adjust to taste.
 */

export interface RecommendationProfile {
  sex: Sex | null;
  weightKg: number | null;
  heightCm: number | null;
  trainingLevel: TrainingLevel | null;
}

export type Recommendation =
  | { kind: "weight"; weightKg: number; sets: number; reps: number }
  | { kind: "reps"; sets: number; reps: number }
  | { kind: "time"; sets: number; seconds: number };

/** Normalise an exercise name into the slug used by i18n + lookup tables. */
export function exerciseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const LEVEL_INDEX: Record<TrainingLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  professional: 3,
};

/** Working-weight multiplier over the beginner baseline, per level. */
const LEVEL_FACTOR = [1, 1.5, 2, 2.4] as const;

/** Sets × reps per level for weighted compound / isolation movements. */
const COMPOUND_SCHEME = [
  { sets: 3, reps: 10 },
  { sets: 4, reps: 8 },
  { sets: 4, reps: 8 },
  { sets: 5, reps: 6 },
] as const;
const ISOLATION_SCHEME = [
  { sets: 3, reps: 12 },
  { sets: 3, reps: 12 },
  { sets: 4, reps: 10 },
  { sets: 4, reps: 10 },
] as const;

/**
 * Beginner working weight as a fraction of body weight (male baseline).
 * Dumbbell movements are per dumbbell. Keys are exerciseSlug(name) of the
 * global seed catalog.
 */
const WEIGHT_RATIOS: Record<string, number> = {
  "bench-press": 0.4,
  "incline-dumbbell-press": 0.12,
  "overhead-press": 0.25,
  "tricep-pushdown": 0.15,
  "lateral-raise": 0.05,
  squat: 0.5,
  "romanian-deadlift": 0.45,
  "leg-press": 1.0,
  "leg-curl": 0.25,
  "calf-raise": 0.35,
  "seated-calf-raise": 0.3,
  deadlift: 0.6,
  "barbell-row": 0.35,
  "seated-cable-row": 0.35,
  "face-pull": 0.12,
  "bicep-curl": 0.08,
  "hammer-curl": 0.08,
  "hip-thrust": 0.6,
  "bulgarian-split-squat": 0.1,
  "wrist-curl": 0.05,
  "reverse-wrist-curl": 0.04,
};

/** Reps per level for bodyweight movements. */
const BODYWEIGHT_REPS: Record<
  string,
  readonly [number, number, number, number]
> = {
  "pull-up": [3, 6, 10, 15],
  "push-up": [8, 15, 25, 40],
  dips: [5, 8, 12, 20],
  crunch: [12, 20, 25, 30],
  "glute-bridge": [12, 15, 20, 25],
  "ab-wheel-rollout": [5, 8, 12, 15],
};

/** Hold time in seconds per level for timed movements. */
const TIMED_SECONDS: Record<string, readonly [number, number, number, number]> =
  {
    plank: [30, 60, 90, 120],
  };

/** Generic fallbacks by equipment for custom exercises. */
const EQUIPMENT_FALLBACK_RATIO: Record<string, number> = {
  barbell: 0.3,
  dumbbell: 0.1,
  cable: 0.2,
  machine: 0.25,
};
const BODYWEIGHT_FALLBACK_REPS = [8, 12, 15, 20] as const;

/** Muscles trained mostly by the lower body (stronger female baseline). */
const LOWER_BODY = new Set(["glutes", "quads", "hamstrings", "calves"]);

function roundWeight(kg: number): number {
  if (kg >= 20) return Math.round(kg / 2.5) * 2.5;
  return Math.max(1, Math.round(kg));
}

/**
 * Compute a personalised recommendation for an exercise, or null when there
 * is not enough information (unknown custom exercise without equipment, or
 * missing body weight for a weighted movement).
 */
export function recommendExercise(
  ex: {
    name: string;
    exercise_type?: string | null;
    equipment?: string | null;
    primary_muscle?: string | null;
  },
  profile: RecommendationProfile,
): Recommendation | null {
  const slug = exerciseSlug(ex.name);
  const levelIdx = LEVEL_INDEX[profile.trainingLevel ?? "beginner"];

  // Timed holds (plank & friends).
  const seconds = TIMED_SECONDS[slug];
  if (seconds) return { kind: "time", sets: 3, seconds: seconds[levelIdx] };

  // Bodyweight rep targets.
  const bwReps =
    BODYWEIGHT_REPS[slug] ??
    (ex.equipment === "bodyweight" && !WEIGHT_RATIOS[slug]
      ? BODYWEIGHT_FALLBACK_REPS
      : undefined);
  if (bwReps) {
    return {
      kind: "reps",
      sets: levelIdx >= 2 ? 4 : 3,
      reps: bwReps[levelIdx],
    };
  }

  // Weighted movements need the user's body weight as the anchor.
  const ratio =
    WEIGHT_RATIOS[slug] ??
    (ex.equipment ? EQUIPMENT_FALLBACK_RATIO[ex.equipment] : undefined);
  if (!ratio || !profile.weightKg) return null;

  let weight = profile.weightKg * ratio * LEVEL_FACTOR[levelIdx];

  // Women carry proportionally less upper-body mass; the lower body is closer.
  if (profile.sex === "female") {
    weight *= LOWER_BODY.has(ex.primary_muscle ?? "") ? 0.75 : 0.65;
  }

  // Taller lifters move through longer ranges — nudge the target down a bit.
  if (profile.heightCm) {
    const heightFactor = Math.min(
      1.08,
      Math.max(0.88, 1 - (profile.heightCm - 175) * 0.004),
    );
    weight *= heightFactor;
  }

  const scheme =
    ex.exercise_type === "isolation"
      ? ISOLATION_SCHEME[levelIdx]
      : COMPOUND_SCHEME[levelIdx];

  return {
    kind: "weight",
    weightKg: roundWeight(weight),
    sets: scheme.sets,
    reps: scheme.reps,
  };
}

/**
 * Global seed exercises with localised description + step-by-step
 * instructions in the "exerciseInfo" i18n namespace (keys = exerciseSlug).
 */
export const EXERCISE_INFO_SLUGS = new Set([
  "bench-press",
  "incline-dumbbell-press",
  "overhead-press",
  "tricep-pushdown",
  "lateral-raise",
  "squat",
  "romanian-deadlift",
  "leg-press",
  "leg-curl",
  "calf-raise",
  "deadlift",
  "barbell-row",
  "pull-up",
  "seated-cable-row",
  "face-pull",
  "bicep-curl",
  "hammer-curl",
  "plank",
  "ab-wheel-rollout",
  "hip-thrust",
  "glute-bridge",
  "bulgarian-split-squat",
  "wrist-curl",
  "reverse-wrist-curl",
  "dips",
  "push-up",
  "crunch",
  "seated-calf-raise",
]);
