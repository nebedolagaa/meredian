import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  type SessionSummary,
  type ExerciseHistory,
  generateInsights,
  type Insight,
} from "@/lib/utils/insights";
import { setVolume } from "@/lib/utils/volume";
import {
  computePersonalRecords,
  type PersonalRecord,
} from "@/lib/utils/records";

type Supa = SupabaseClient<Database>;

interface LogRow {
  session_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  plan_exercises: {
    target_sets: number;
    exercises: { name: string } | null;
  } | null;
}

interface SessionRow {
  id: string;
  scheduled_date: string;
  status: string;
  plan_id: string | null;
}

export interface AnalyticsData {
  sessions: SessionSummary[];
  history: ExerciseHistory[];
  insights: Insight[];
  /** Volume per completed session, ordered oldest -> newest. */
  volumeSeries: { date: string; volume: number; planned: number }[];
  exerciseNames: string[];
  records: PersonalRecord[];
}

export async function getAnalyticsData(
  supabase: Supa,
  userId: string,
): Promise<AnalyticsData> {
  // Sessions in the last ~60 days.
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceISO = since.toISOString().slice(0, 10);

  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status, plan_id")
    .eq("user_id", userId)
    .gte("scheduled_date", sinceISO)
    .order("scheduled_date", { ascending: true });

  const sessions = (sessionRows ?? []) as SessionRow[];
  const sessionIds = sessions.map((s) => s.id);

  // Planned sets per plan (sum of target_sets across plan exercises).
  const planIds = Array.from(
    new Set(sessions.map((s) => s.plan_id).filter((x): x is string => !!x)),
  );
  const plannedSetsByPlan = new Map<string, number>();
  const plannedVolumeByPlan = new Map<string, number>();
  if (planIds.length > 0) {
    const { data: planEx } = await supabase
      .from("plan_exercises")
      .select("plan_id, target_sets, target_reps, target_weight")
      .in("plan_id", planIds);
    for (const row of planEx ?? []) {
      plannedSetsByPlan.set(
        row.plan_id,
        (plannedSetsByPlan.get(row.plan_id) ?? 0) + row.target_sets,
      );
      plannedVolumeByPlan.set(
        row.plan_id,
        (plannedVolumeByPlan.get(row.plan_id) ?? 0) +
          row.target_sets * row.target_reps * row.target_weight,
      );
    }
  }

  // Logs for these sessions, joined to exercise name.
  let logs: LogRow[] = [];
  if (sessionIds.length > 0) {
    const { data: logRows } = await supabase
      .from("session_logs")
      .select(
        "session_id, set_number, actual_reps, actual_weight, completed, plan_exercises(target_sets, exercises(name))",
      )
      .in("session_id", sessionIds);
    logs = (logRows ?? []) as unknown as LogRow[];
  }

  // Aggregate per session.
  const volumeBySession = new Map<string, number>();
  const completedSetsBySession = new Map<string, number>();
  // exerciseName -> sessionId -> max weight
  const exerciseSessionMax = new Map<string, Map<string, number>>();

  for (const log of logs) {
    if (log.completed) {
      volumeBySession.set(
        log.session_id,
        (volumeBySession.get(log.session_id) ?? 0) +
          setVolume(log.actual_reps, log.actual_weight),
      );
      completedSetsBySession.set(
        log.session_id,
        (completedSetsBySession.get(log.session_id) ?? 0) + 1,
      );
    }
    const name = log.plan_exercises?.exercises?.name;
    if (name && log.actual_weight != null) {
      let perSession = exerciseSessionMax.get(name);
      if (!perSession) {
        perSession = new Map();
        exerciseSessionMax.set(name, perSession);
      }
      perSession.set(
        log.session_id,
        Math.max(perSession.get(log.session_id) ?? 0, log.actual_weight),
      );
    }
  }

  const summaries: SessionSummary[] = sessions.map((s) => ({
    date: s.scheduled_date,
    volume: volumeBySession.get(s.id) ?? 0,
    plannedSets: s.plan_id ? (plannedSetsByPlan.get(s.plan_id) ?? 0) : 0,
    completedSets: completedSetsBySession.get(s.id) ?? 0,
    completed: s.status === "completed",
  }));

  const orderedSessionIds = sessions.map((s) => s.id);
  const history: ExerciseHistory[] = Array.from(
    exerciseSessionMax.entries(),
  ).map(([name, perSession]) => ({
    name,
    maxWeights: orderedSessionIds
      .filter((id) => perSession.has(id))
      .map((id) => perSession.get(id)!),
  }));

  const completedSummaries = summaries.filter((s) => s.completed);
  const volumeSeries = sessions
    .filter((s) => s.status === "completed")
    .map((s) => ({
      date: s.scheduled_date,
      volume: volumeBySession.get(s.id) ?? 0,
      planned: s.plan_id ? (plannedVolumeByPlan.get(s.plan_id) ?? 0) : 0,
    }));

  const insights = generateInsights({ sessions: completedSummaries, history });

  const records = computePersonalRecords(
    logs
      .filter((l) => l.completed && l.actual_weight != null)
      .map((l) => ({
        name: l.plan_exercises?.exercises?.name ?? "",
        weight: l.actual_weight ?? 0,
        reps: l.actual_reps ?? 0,
      }))
      .filter((l) => l.name),
  );

  return {
    sessions: summaries,
    history,
    insights,
    volumeSeries,
    exerciseNames: Array.from(exerciseSessionMax.keys()).sort(),
    records,
  };
}

/**
 * Per-exercise actual weight over time for the progress chart.
 * Returns points ordered oldest -> newest with the max weight that day.
 */
export async function getExerciseProgress(
  supabase: Supa,
  userId: string,
  exerciseName: string,
): Promise<{ date: string; weight: number }[]> {
  const { data: sessionRows } = await supabase
    .from("workout_sessions")
    .select("id, scheduled_date, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("scheduled_date", { ascending: true });

  const sessions = (sessionRows ?? []) as {
    id: string;
    scheduled_date: string;
  }[];
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: logRows } = await supabase
    .from("session_logs")
    .select(
      "session_id, actual_weight, completed, plan_exercises(exercises(name))",
    )
    .in("session_id", ids);

  const logs = (logRows ?? []) as unknown as LogRow[];
  const dateById = new Map(sessions.map((s) => [s.id, s.scheduled_date]));
  const maxByDate = new Map<string, number>();

  for (const log of logs) {
    if (!log.completed || log.actual_weight == null) continue;
    if (log.plan_exercises?.exercises?.name !== exerciseName) continue;
    const date = dateById.get(log.session_id);
    if (!date) continue;
    maxByDate.set(date, Math.max(maxByDate.get(date) ?? 0, log.actual_weight));
  }

  return Array.from(maxByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weight]) => ({ date, weight }));
}
