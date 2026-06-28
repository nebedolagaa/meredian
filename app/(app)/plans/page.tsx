import Link from "next/link";
import { Plus, Dumbbell, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DuplicatePlanButton } from "@/components/plans/DuplicatePlanButton";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const supabase = createClient();
  const t = await getTranslations("plans");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: plans } = await supabase
    .from("workout_plans")
    .select("id, name, created_at, plan_exercises(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Last used date per plan.
  const planIds = (plans ?? []).map((p) => p.id);
  const lastUsed = new Map<string, string>();
  if (planIds.length > 0) {
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("plan_id, scheduled_date")
      .eq("user_id", user.id)
      .in("plan_id", planIds)
      .order("scheduled_date", { ascending: false });
    for (const s of sessions ?? []) {
      if (s.plan_id && !lastUsed.has(s.plan_id)) {
        lastUsed.set(s.plan_id, s.scheduled_date);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t("title")}
        action={
          <Button asChild size="sm">
            <Link href="/plans/new">
              <Plus className="h-4 w-4" /> {t("new")}
            </Link>
          </Button>
        }
      />

      {(plans ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <Dumbbell className="h-8 w-8 text-bone-dim" />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-bone">{t("noPlans")}</p>
            <p className="text-xs text-bone-dim">{t("buildFirst")}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/plans/new">{t("createPlan")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {(plans ?? []).map((plan) => {
            const count =
              (plan.plan_exercises as { count: number }[] | null)?.[0]?.count ??
              0;
            return (
              <Card
                key={plan.id}
                className="flex items-center justify-between p-4 transition-colors hover:border-steel/40"
              >
                <Link
                  href={`/plans/${plan.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-1"
                >
                  <span className="font-medium text-bone">{plan.name}</span>
                  <span className="font-num text-xs tabular-nums text-bone-dim">
                    {t("exerciseCount", { count })}
                    {lastUsed.has(plan.id) && (
                      <> · {t("lastUsed", { date: lastUsed.get(plan.id)! })}</>
                    )}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <DuplicatePlanButton planId={plan.id} />
                  <Link href={`/plans/${plan.id}`} aria-label={plan.name}>
                    <ChevronRight className="h-5 w-5 text-bone-dim" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
