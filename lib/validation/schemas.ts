import { z } from "zod";

/**
 * Centralised validation schemas for server actions. Validating at the system
 * boundary keeps untrusted input (and accidental client bugs) out of the DB.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

// bcrypt (used by Supabase Auth) silently truncates at 72 bytes — cap there.
// Minimum of 8 follows NIST 800-63B guidance (enable leaked-password protection
// in the Supabase dashboard for breach checks).
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.");

export const displayNameSchema = z.string().trim().min(1).max(60);

export const exerciseNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(80, "Name is too long.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().max(60).optional(),
});

export const planExerciseSchema = z.object({
  exercise_id: z.string().uuid("Invalid exercise."),
  target_sets: z.number().int().min(1).max(50),
  target_reps: z.number().int().min(1).max(1000),
  target_weight: z.number().min(0).max(10000),
  rest_seconds: z.number().int().min(0).max(600).nullable().optional(),
  superset_group: z.number().int().min(1).max(100).nullable().optional(),
});

export const savePlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required.").max(120),
  exercises: z.array(planExerciseSchema).max(100),
});

// Onboarding wizard payload. Weights/height arrive already converted to
// metric (kg / cm); sex is optional ("prefer not to say").
export const onboardingSchema = z.object({
  unit: z.enum(["kg", "lb"]),
  sex: z.enum(["male", "female"]).nullable(),
  weightKg: z
    .number()
    .positive("Weight must be greater than zero.")
    .max(1000, "That weight looks too high."),
  heightCm: z
    .number()
    .positive("Height must be greater than zero.")
    .max(300, "That height looks too high."),
  goalType: z.enum(["lose_weight", "gain_muscle", "burn_fat"]),
  goalWeightKg: z
    .number()
    .positive("Goal weight must be greater than zero.")
    .max(1000, "That weight looks too high."),
  trainingLevel: z
    .enum(["beginner", "intermediate", "advanced", "professional"])
    .nullable(),
});

// Body profile + weight goal editable from the profile page. All fields are
// nullable ("not set yet"); metric units (kg / cm) arrive already converted.
export const bodyGoalSchema = z.object({
  sex: z.enum(["male", "female"]).nullable(),
  heightCm: z
    .number()
    .positive("Invalid height")
    .max(300, "Invalid height")
    .nullable(),
  goalType: z.enum(["lose_weight", "gain_muscle", "burn_fat"]).nullable(),
  goalWeightKg: z
    .number()
    .positive("Invalid goal weight")
    .max(1000, "Invalid goal weight")
    .nullable(),
});

const girthSchema = z
  .number()
  .positive("Invalid measurement")
  .max(500, "Invalid measurement")
  .nullable()
  .optional();

export const measurementSchema = z.object({
  weightKg: z
    .number()
    .positive("Weight must be greater than zero.")
    .max(1000, "That weight looks too high."),
  measuredOn: isoDateSchema,
  note: z.string().trim().max(280).optional(),
  waistCm: girthSchema,
  chestCm: girthSchema,
  armCm: girthSchema,
});

// Per-set logs persisted when finishing a session. Bounds keep untrusted client
// input (out-of-range numbers, unbounded note text) out of the DB.
export const sessionLogSchema = z.object({
  plan_exercise_id: z.string().uuid("Invalid exercise."),
  set_number: z.number().int().min(1).max(100),
  actual_reps: z.number().int().min(0).max(1000).nullable(),
  actual_weight: z.number().min(0).max(10000).nullable(),
  completed: z.boolean(),
  rpe: z.number().int().min(1).max(10).nullable(),
  note: z.string().trim().max(280).nullable(),
});

export const sessionLogsSchema = z.array(sessionLogSchema).max(500);

export const sessionNotesSchema = z.string().trim().max(1000).nullable();

/**
 * Helper: run a Zod schema and return the first error message, if any.
 */
export function firstError(
  result: { success: false; error: z.ZodError } | { success: true },
): string | undefined {
  if (result.success) return undefined;
  return result.error.issues[0]?.message ?? "Invalid input.";
}
