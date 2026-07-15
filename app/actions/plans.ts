"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { savePlanSchema, firstError } from "@/lib/validation/schemas";
import { safeActionError } from "@/lib/utils/errors";
import { uniquePlanSlug } from "@/lib/data/planSlug";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export interface PlanExerciseInput {
  exercise_id: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  rest_seconds?: number | null;
  /** Exercises sharing a non-null group number form a superset. */
  superset_group?: number | null;
}

export interface SavePlanResult {
  error?: string;
  id?: string;
}

/** Retry payload for databases without migration 0019 (no superset_group). */
function stripSupersetGroup<T extends { superset_group?: number | null }>(
  rows: T[],
): Omit<T, "superset_group">[] {
  return rows.map((r) => {
    const copy: Record<string, unknown> = { ...r };
    delete copy.superset_group;
    return copy as Omit<T, "superset_group">;
  });
}

/**
 * Create or update a plan together with its ordered exercises.
 * When `planId` is provided, the plan's exercises are fully replaced.
 */
export async function savePlan(
  planId: string | null,
  name: string,
  exercises: PlanExerciseInput[],
): Promise<SavePlanResult> {
  try {
    const { supabase, user } = await requireUser();

    const parsed = savePlanSchema.safeParse({ name, exercises });
    if (!parsed.success) return { error: firstError(parsed) };
    const cleanName = parsed.data.name;

    let id = planId;

    if (id) {
      const slug = await uniquePlanSlug(supabase, user.id, cleanName, id);
      const { error } = await supabase
        .from("workout_plans")
        .update({ name: cleanName, slug })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return { error: safeActionError("savePlan", error) };

      // Replace existing plan exercises.
      const { error: delError } = await supabase
        .from("plan_exercises")
        .delete()
        .eq("plan_id", id);
      if (delError) return { error: safeActionError("savePlan", delError) };
    } else {
      const slug = await uniquePlanSlug(supabase, user.id, cleanName);
      const { data, error } = await supabase
        .from("workout_plans")
        .insert({ name: cleanName, slug, user_id: user.id })
        .select("id")
        .single();
      if (error) return { error: safeActionError("savePlan", error) };
      id = data.id;
    }

    if (exercises.length > 0) {
      const rows = exercises.map((e, index) => ({
        plan_id: id!,
        exercise_id: e.exercise_id,
        order_index: index,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: e.target_weight,
        rest_seconds: e.rest_seconds ?? null,
        superset_group: e.superset_group ?? null,
      }));
      let { error } = await supabase.from("plan_exercises").insert(rows);
      // Fall back for a database without migration 0019 (no superset_group).
      if (error) {
        ({ error } = await supabase
          .from("plan_exercises")
          .insert(stripSupersetGroup(rows)));
      }
      if (error) return { error: safeActionError("savePlan", error) };
    }

    revalidatePath("/plans");
    return { id: id! };
  } catch (e) {
    return { error: safeActionError("savePlan", e) };
  }
}

export async function deletePlan(planId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_plans")
      .delete()
      .eq("id", planId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("deletePlan", error) };
    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: safeActionError("deletePlan", e) };
  }
}

/** Mark (or unmark) a plan as a reusable template. */
export async function setPlanIsTemplate(
  planId: string,
  isTemplate: boolean,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_plans")
      .update({ is_template: isTemplate })
      .eq("id", planId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("setPlanIsTemplate", error) };
    revalidatePath("/plans");
    return {};
  } catch (e) {
    return { error: safeActionError("setPlanIsTemplate", e) };
  }
}

/** Toggle a plan between active and archived. */
export async function setPlanArchived(
  planId: string,
  archived: boolean,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_plans")
      .update({ is_archived: archived })
      .eq("id", planId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("setPlanArchived", error) };
    revalidatePath("/plans");
    revalidatePath("/dashboard");
    return {};
  } catch (e) {
    return { error: safeActionError("setPlanArchived", e) };
  }
}

/**
 * Duplicate a plan (with all its exercises) as a new template.
 */
export async function duplicatePlan(
  planId: string,
): Promise<{ error?: string; id?: string }> {
  try {
    const { supabase, user } = await requireUser();

    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .select("name")
      .eq("id", planId)
      .eq("user_id", user.id)
      .single();
    if (planError)
      return { error: safeActionError("duplicatePlan", planError) };

    const copyName = `${plan.name} (copy)`;
    const slug = await uniquePlanSlug(supabase, user.id, copyName);
    const { data: created, error: createError } = await supabase
      .from("workout_plans")
      .insert({ name: copyName, slug, user_id: user.id })
      .select("id")
      .single();
    if (createError)
      return { error: safeActionError("duplicatePlan", createError) };

    const { data: exercises, error: exError } = await supabase
      .from("plan_exercises")
      .select(
        "exercise_id, order_index, target_sets, target_reps, target_weight, rest_seconds",
      )
      .eq("plan_id", planId);
    if (exError) return { error: safeActionError("duplicatePlan", exError) };

    // Superset groups are read separately so a database without migration
    // 0019 still duplicates cleanly.
    const groupByOrder = new Map<number, number | null>();
    const { data: groupRows } = await supabase
      .from("plan_exercises")
      .select("order_index, superset_group")
      .eq("plan_id", planId);
    for (const g of groupRows ?? []) {
      groupByOrder.set(g.order_index, g.superset_group);
    }

    if (exercises && exercises.length > 0) {
      const rows = exercises.map((e) => ({
        plan_id: created.id,
        exercise_id: e.exercise_id,
        order_index: e.order_index,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: e.target_weight,
        rest_seconds: e.rest_seconds,
        superset_group: groupByOrder.get(e.order_index) ?? null,
      }));
      let { error: insError } = await supabase
        .from("plan_exercises")
        .insert(rows);
      if (insError) {
        ({ error: insError } = await supabase
          .from("plan_exercises")
          .insert(stripSupersetGroup(rows)));
      }
      if (insError)
        return { error: safeActionError("duplicatePlan", insError) };
    }

    revalidatePath("/plans");
    return { id: created.id };
  } catch (e) {
    return { error: safeActionError("duplicatePlan", e) };
  }
}

/**
 * Enable or disable a public share link for a plan. Returns the token when
 * enabled — the share page itself is served through the admin client.
 */
export async function setPlanShared(
  planId: string,
  shared: boolean,
): Promise<{ error?: string; token?: string | null }> {
  try {
    const { supabase, user } = await requireUser();
    const token = shared ? crypto.randomUUID() : null;
    const { error } = await supabase
      .from("workout_plans")
      .update({ share_token: token })
      .eq("id", planId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("setPlanShared", error) };
    revalidatePath("/plans");
    return { token };
  } catch (e) {
    return { error: safeActionError("setPlanShared", e) };
  }
}

/**
 * Copy a shared plan (looked up by its share token) into the caller's
 * account. Reads through the admin client because the sharer's rows are
 * protected by owner-only RLS.
 */
export async function importSharedPlan(
  token: string,
): Promise<{ error?: string; id?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!z.string().uuid().safeParse(token).success) {
      return { error: "Invalid share link." };
    }

    const admin = createAdminClient();
    if (!admin) return { error: "Sharing is not configured on this server." };

    const { data: plan } = await admin
      .from("workout_plans")
      .select("id, name")
      .eq("share_token", token)
      .maybeSingle();
    if (!plan) return { error: "This share link is no longer valid." };

    const { data: exercises } = await admin
      .from("plan_exercises")
      .select(
        "exercise_id, order_index, target_sets, target_reps, target_weight, rest_seconds, superset_group, exercises(user_id)",
      )
      .eq("plan_id", plan.id)
      .order("order_index", { ascending: true });

    const slug = await uniquePlanSlug(supabase, user.id, plan.name);
    const { data: created, error: createError } = await supabase
      .from("workout_plans")
      .insert({ name: plan.name, slug, user_id: user.id })
      .select("id")
      .single();
    if (createError)
      return { error: safeActionError("importSharedPlan", createError) };

    // Only global catalog exercises (user_id null) can cross accounts; the
    // sharer's custom exercises are dropped from the copy.
    const importable = (exercises ?? []).filter(
      (e) =>
        e.exercise_id &&
        (e.exercises as { user_id: string | null } | null)?.user_id == null,
    );
    if (importable.length > 0) {
      const rows = importable.map((e, index) => ({
        plan_id: created.id,
        exercise_id: e.exercise_id,
        order_index: index,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight: e.target_weight,
        rest_seconds: e.rest_seconds,
        superset_group: e.superset_group ?? null,
      }));
      let { error: insError } = await supabase
        .from("plan_exercises")
        .insert(rows);
      if (insError) {
        ({ error: insError } = await supabase
          .from("plan_exercises")
          .insert(stripSupersetGroup(rows)));
      }
      if (insError)
        return { error: safeActionError("importSharedPlan", insError) };
    }

    revalidatePath("/plans");
    return { id: created.id };
  } catch (e) {
    return { error: safeActionError("importSharedPlan", e) };
  }
}
