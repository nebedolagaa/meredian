"use server";

import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types/database";
import { exerciseNameSchema, firstError } from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * Full catalog (global + user-owned) for the exercise library picker.
 * The catalog is small, so filtering/search happen client-side.
 */
export async function listExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[listExercises]", error);
    return [];
  }
  return data ?? [];
}

export interface CreateExerciseResult {
  error?: string;
  exercise?: Exercise;
}

/**
 * Create a custom user-owned exercise inline from the plan builder.
 */
export async function createCustomExercise(
  name: string,
): Promise<CreateExerciseResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = exerciseNameSchema.safeParse(name);
    if (!parsed.success) return { error: firstError(parsed) };

    const { data, error } = await supabase
      .from("exercises")
      .insert({ name: parsed.data, user_id: user.id })
      .select("*")
      .single();

    if (error) return { error: safeActionError("createCustomExercise", error) };
    return { exercise: data };
  } catch (e) {
    return { error: safeActionError("createCustomExercise", e) };
  }
}
