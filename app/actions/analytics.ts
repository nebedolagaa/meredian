"use server";

import { createClient } from "@/lib/supabase/server";
import { getExerciseProgress } from "@/lib/data/analytics";

export async function exerciseProgressAction(
  exerciseName: string,
): Promise<{ date: string; weight: number }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return getExerciseProgress(supabase, user.id, exerciseName);
}
