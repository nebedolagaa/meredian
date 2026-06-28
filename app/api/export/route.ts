import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ExportLogRow {
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  completed: boolean;
  workout_sessions: {
    scheduled_date: string;
    status: string;
    workout_plans: { name: string } | null;
  } | null;
  plan_exercises: {
    exercises: { name: string } | null;
  } | null;
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Export the signed-in user's logged sets as CSV or JSON.
 * Usage: /api/export?format=csv  |  /api/export?format=json
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const format =
    request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id);
  const sessionIds = (sessions ?? []).map((s) => s.id);

  let logs: ExportLogRow[] = [];
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("session_logs")
      .select(
        "set_number, actual_reps, actual_weight, completed, workout_sessions(scheduled_date, status, workout_plans(name)), plan_exercises(exercises(name))",
      )
      .in("session_id", sessionIds);
    logs = (data ?? []) as unknown as ExportLogRow[];
  }

  const rows = logs.map((l) => ({
    date: l.workout_sessions?.scheduled_date ?? "",
    plan: l.workout_sessions?.workout_plans?.name ?? "",
    status: l.workout_sessions?.status ?? "",
    exercise: l.plan_exercises?.exercises?.name ?? "",
    set: l.set_number,
    reps: l.actual_reps ?? "",
    weight_kg: l.actual_weight ?? "",
    completed: l.completed,
  }));

  rows.sort((a, b) => a.date.localeCompare(b.date));

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="meridian-export-${stamp}.json"`,
      },
    });
  }

  const header = [
    "date",
    "plan",
    "status",
    "exercise",
    "set",
    "reps",
    "weight_kg",
    "completed",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.date,
        r.plan,
        r.status,
        r.exercise,
        r.set,
        r.reps,
        r.weight_kg,
        r.completed,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meridian-export-${stamp}.csv"`,
    },
  });
}
