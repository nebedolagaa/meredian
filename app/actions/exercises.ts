"use server";

import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types/database";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * Live search across global + user-owned exercises (ILIKE).
 */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const supabase = createClient();
  const q = query.trim();

  let request = supabase
    .from("exercises")
    .select("*")
    .order("name", { ascending: true })
    .limit(12);

  if (q) request = request.ilike("name", `%${q}%`);

  const { data, error } = await request;
  if (error) return [];
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
    if (!name.trim()) return { error: "Name is required." };

    const { data, error } = await supabase
      .from("exercises")
      .insert({ name: name.trim(), user_id: user.id })
      .select("*")
      .single();

    if (error) return { error: error.message };
    return { exercise: data };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
