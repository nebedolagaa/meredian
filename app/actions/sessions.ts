"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isoDateSchema,
  sessionLogsSchema,
  sessionNotesSchema,
} from "@/lib/validation/schemas";
import { todayISO, addDays, toISODate } from "@/lib/utils/dates";
import { safeActionError } from "@/lib/utils/errors";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export interface ActionResult {
  error?: string;
  id?: string;
}

/**
 * Create a planned session for a plan on a date.
 */
export async function createSession(
  planId: string | null,
  scheduledDate: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!isoDateSchema.safeParse(scheduledDate).success) {
      return { error: "A valid date is required." };
    }
    if (planId) {
      const { data: plan } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!plan) return { error: "Plan not found." };
    }
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        plan_id: planId,
        user_id: user.id,
        scheduled_date: scheduledDate,
        status: "planned",
      })
      .select("id")
      .single();

    if (error) return { error: safeActionError("createSession", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { id: data.id };
  } catch (e) {
    return { error: safeActionError("createSession", e) };
  }
}

const MAX_RECURRING_WEEKS = 12;

/**
 * Create planned sessions for `weeks` weeks starting on `startDate`.
 * By default one session per week on the start date's weekday; pass
 * `weekdays` (0 = Monday … 6 = Sunday) to schedule several days per week.
 */
export async function createRecurringSessions(
  planId: string | null,
  startDate: string,
  weeks: number,
  weekdays?: number[],
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!isoDateSchema.safeParse(startDate).success) {
      return { error: "A valid date is required." };
    }
    if (!Number.isInteger(weeks) || weeks < 2 || weeks > MAX_RECURRING_WEEKS) {
      return { error: `Repeat count must be between 2 and ${MAX_RECURRING_WEEKS} weeks.` };
    }
    const days = [...new Set(weekdays ?? [])].filter(
      (d) => Number.isInteger(d) && d >= 0 && d <= 6,
    );
    if (planId) {
      const { data: plan } = await supabase
        .from("workout_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!plan) return { error: "Plan not found." };
    }

    const start = new Date(`${startDate}T00:00:00`);
    let rows: {
      plan_id: string | null;
      user_id: string;
      scheduled_date: string;
      status: "planned";
    }[];
    if (days.length > 0) {
      // Monday of the start week anchors the weekday pattern.
      const monday = addDays(start, -((start.getDay() + 6) % 7));
      rows = [];
      for (let w = 0; w < weeks; w++) {
        for (const d of days) {
          const date = addDays(monday, w * 7 + d);
          if (toISODate(date) < startDate) continue; // don't schedule in the past
          rows.push({
            plan_id: planId,
            user_id: user.id,
            scheduled_date: toISODate(date),
            status: "planned" as const,
          });
        }
      }
      if (rows.length === 0) return { error: "No dates to schedule." };
    } else {
      rows = Array.from({ length: weeks }, (_, i) => ({
        plan_id: planId,
        user_id: user.id,
        scheduled_date: toISODate(addDays(start, 7 * i)),
        status: "planned" as const,
      }));
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert(rows)
      .select("id");

    if (error) return { error: safeActionError("createRecurringSessions", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { id: data?.[0]?.id };
  } catch (e) {
    return { error: safeActionError("createRecurringSessions", e) };
  }
}

export async function startSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    // started_at anchors workout duration. Fall back to a plain status update
    // if migration 0019 hasn't been applied yet.
    const { error } = await supabase
      .from("workout_sessions")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) {
      const { error: retryError } = await supabase
        .from("workout_sessions")
        .update({ status: "in_progress" })
        .eq("id", sessionId)
        .eq("user_id", user.id);
      if (retryError)
        return { error: safeActionError("startSession", retryError) };
    }
    revalidatePath(`/session/${sessionId}`);
    revalidatePath("/dashboard");
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("startSession", e) };
  }
}

/**
 * Create and immediately start a session for today from an existing plan.
 * Powers the dashboard "log a workout now" quick action (ad-hoc logging).
 */
export async function logWorkoutNow(planId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: plan } = await supabase
      .from("workout_plans")
      .select("id")
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!plan) return { error: "Plan not found." };
    let { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        plan_id: planId,
        user_id: user.id,
        scheduled_date: todayISO(),
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    // Fall back for a database without migration 0019 (no started_at yet).
    if (error) {
      ({ data, error } = await supabase
        .from("workout_sessions")
        .insert({
          plan_id: planId,
          user_id: user.id,
          scheduled_date: todayISO(),
          status: "in_progress",
        })
        .select("id")
        .single());
    }
    if (error || !data)
      return { error: safeActionError("logWorkoutNow", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { id: data.id };
  } catch (e) {
    return { error: safeActionError("logWorkoutNow", e) };
  }
}

export interface LogInput {
  plan_exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  rpe: number | null;
  note: string | null;
}

/**
 * Persist all set logs for a session and mark it completed.
 * Replaces any existing logs for the session (idempotent finish).
 */
export async function completeSession(
  sessionId: string,
  logs: LogInput[],
  notes?: string | null,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    // Defence in depth: confirm the session belongs to the caller before
    // touching its logs (session_logs has no user_id column to scope on).
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) return { error: "Session not found." };

    const parsed = sessionLogsSchema.safeParse(logs);
    if (!parsed.success) return { error: "Invalid session data." };
    const safeLogs = parsed.data;

    const parsedNotes = sessionNotesSchema.safeParse(notes ?? null);
    if (!parsedNotes.success) return { error: "Invalid notes." };

    // Clear existing logs for this session, then insert fresh.
    const { error: delError } = await supabase
      .from("session_logs")
      .delete()
      .eq("session_id", sessionId);
    if (delError)
      return { error: safeActionError("completeSession", delError) };

    if (safeLogs.length > 0) {
      const { error: insError } = await supabase.from("session_logs").insert(
        safeLogs.map((l) => ({
          session_id: sessionId,
          plan_exercise_id: l.plan_exercise_id,
          set_number: l.set_number,
          actual_reps: l.actual_reps,
          actual_weight: l.actual_weight,
          completed: l.completed,
          rpe: l.rpe,
          note: l.note,
        })),
      );
      if (insError)
        return { error: safeActionError("completeSession", insError) };
    }

    const { error: updError } = await supabase
      .from("workout_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        notes: parsedNotes.data || null,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (updError)
      return { error: safeActionError("completeSession", updError) };

    revalidatePath("/dashboard");
    revalidatePath("/analytics");
    revalidatePath("/calendar");
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("completeSession", e) };
  }
}

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("deleteSession", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return {};
  } catch (e) {
    return { error: safeActionError("deleteSession", e) };
  }
}

/**
 * Move a session to a different date.
 */
export async function rescheduleSession(
  sessionId: string,
  scheduledDate: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    if (!isoDateSchema.safeParse(scheduledDate).success) {
      return { error: "A valid date is required." };
    }
    const { error } = await supabase
      .from("workout_sessions")
      .update({ scheduled_date: scheduledDate })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("rescheduleSession", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("rescheduleSession", e) };
  }
}

/**
 * Update only the session notes — much lighter than re-running
 * completeSession with every log when the user just edits the note.
 */
export async function updateSessionNotes(
  sessionId: string,
  notes: string | null,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsedNotes = sessionNotesSchema.safeParse(notes ?? null);
    if (!parsedNotes.success) return { error: "Invalid notes." };
    const { error } = await supabase
      .from("workout_sessions")
      .update({ notes: parsedNotes.data || null })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("updateSessionNotes", error) };
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("updateSessionNotes", e) };
  }
}

/**
 * Swap the exercise behind a plan slot for another one (e.g. the machine is
 * taken mid-workout). Existing logs keep pointing at the same plan slot.
 * Note: the plan itself is updated, so future sessions use the new exercise.
 */
export async function swapPlanExercise(
  planExerciseId: string,
  newExerciseId: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    // The slot must belong to one of the caller's plans.
    const { data: slot } = await supabase
      .from("plan_exercises")
      .select("id, workout_plans!inner(user_id)")
      .eq("id", planExerciseId)
      .eq("workout_plans.user_id", user.id)
      .maybeSingle();
    if (!slot) return { error: "Exercise not found." };

    // The replacement must be a catalog exercise or the user's own.
    const { data: exercise } = await supabase
      .from("exercises")
      .select("id, user_id")
      .eq("id", newExerciseId)
      .maybeSingle();
    if (!exercise || (exercise.user_id && exercise.user_id !== user.id)) {
      return { error: "Exercise not found." };
    }

    const { error } = await supabase
      .from("plan_exercises")
      .update({ exercise_id: newExerciseId })
      .eq("id", planExerciseId);
    if (error) return { error: safeActionError("swapPlanExercise", error) };

    revalidatePath("/dashboard");
    return { id: planExerciseId };
  } catch (e) {
    return { error: safeActionError("swapPlanExercise", e) };
  }
}

/**
 * Mark a session as skipped (or reopen it back to planned).
 */
export async function setSessionStatus(
  sessionId: string,
  status: "planned" | "in_progress" | "completed" | "skipped",
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("workout_sessions")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    if (error) return { error: safeActionError("setSessionStatus", error) };
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    revalidatePath(`/session/${sessionId}`);
    return { id: sessionId };
  } catch (e) {
    return { error: safeActionError("setSessionStatus", e) };
  }
}
