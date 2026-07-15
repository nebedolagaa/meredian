import { getTranslations } from "next-intl/server";
import { Dumbbell, ListChecks } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wordmark } from "@/components/layout/Wordmark";
import { ImportPlanButton } from "@/components/plans/ImportPlanButton";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SharedExercise {
  id: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  exercises: { name: string } | null;
}

/**
 * Public, read-only view of a shared plan. Rows are fetched through the
 * admin client (share links bypass owner-only RLS by design); nothing
 * user-identifying is rendered.
 */
export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("sharePlan");

  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: { id: string; name: string } | null = null;
  let exercises: SharedExercise[] = [];
  if (admin && UUID_RE.test(token)) {
    const { data } = await admin
      .from("workout_plans")
      .select("id, name")
      .eq("share_token", token)
      .maybeSingle();
    plan = data;
    if (plan) {
      const { data: rows } = await admin
        .from("plan_exercises")
        .select(
          "id, target_sets, target_reps, target_weight, exercises(name)",
        )
        .eq("plan_id", plan.id)
        .order("order_index", { ascending: true });
      exercises = (rows ?? []) as unknown as SharedExercise[];
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-4 py-10 md:max-w-md">
      <Wordmark className="!flex-row justify-center gap-2" />

      {!plan ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-bone-dim">
            {t("invalid")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-steel" />
              {plan.name}
            </CardTitle>
            <p className="flex items-center gap-1.5 text-xs text-bone-dim">
              <ListChecks className="h-3.5 w-3.5" />
              {t("exerciseCount", { count: exercises.length })}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="divide-y divide-panel-border">
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm text-bone">
                    {ex.exercises?.name ?? t("exercise")}
                  </span>
                  <span className="shrink-0 font-num text-xs tabular-nums text-bone-dim">
                    {ex.target_sets}×{ex.target_reps}
                    {ex.target_weight > 0 && ` @ ${ex.target_weight}kg`}
                  </span>
                </div>
              ))}
            </div>

            <ImportPlanButton token={token} signedIn={!!user} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
