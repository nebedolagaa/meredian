import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type Supa = SupabaseClient<Database>;

/** Normalise a plan name into a URL-safe slug. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "plan"
  );
}

/**
 * Build a slug for a plan name that is unique among the user's plans.
 * Appends "-2", "-3", … when the base slug is already taken.
 * Pass `excludeId` when renaming an existing plan so it doesn't clash with
 * itself.
 */
export async function uniquePlanSlug(
  supabase: Supa,
  userId: string,
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(name);

  const { data } = await supabase
    .from("workout_plans")
    .select("id, slug")
    .eq("user_id", userId)
    .like("slug", `${base}%`);

  const taken = new Set(
    (data ?? [])
      .filter((row) => row.id !== excludeId && row.slug)
      .map((row) => row.slug as string),
  );

  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
