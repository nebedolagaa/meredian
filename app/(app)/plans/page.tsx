import Link from "next/link";
import { Plus, Dumbbell, ChevronRight, Archive, ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DuplicatePlanButton } from "@/components/plans/DuplicatePlanButton";
import { ArchivePlanButton } from "@/components/plans/ArchivePlanButton";
import { DeletePlanButton } from "@/components/plans/DeletePlanButton";

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
    .select("id, name, created_at, is_archived, plan_exercises(count)")
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

  const activePlans = (plans ?? []).filter((p) => !p.is_archived);
  const archivedPlans = (plans ?? []).filter((p) => p.is_archived);
  const exerciseCount = (plan: {
    plan_exercises: { count: number }[] | null;
  }) => plan.plan_exercises?.[0]?.count ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title={t("title")}
        action={
          <Button asChild size="sm">
            <Link href="/plans/new" data-tour="new-plan">
              <Plus className="h-4 w-4" /> {t("new")}
            </Link>
          </Button>
        }
      />

      {(plans ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-5 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-steel/10 text-steel">
            <Dumbbell className="h-7 w-7" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium text-bone">{t("noPlans")}</p>
            <p className="text-sm text-bone-dim">{t("buildFirst")}</p>
          </div>
          <Button asChild size="sm">
            <Link href="/plans/new">
              <Plus className="h-4 w-4" /> {t("createPlan")}
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {activePlans.map((plan) => (
            <Card
              key={plan.id}
              className="group flex flex-col p-0 transition-colors hover:border-steel/40"
            >
              <Link
                href={`/plans/${plan.id}`}
                className="flex items-center gap-3 p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-steel/10 text-steel">
                  <Dumbbell className="h-5 w-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-bone">
                    {plan.name}
                  </span>
                  <span className="flex items-center gap-1.5 font-num text-xs tabular-nums text-bone-dim">
                    <ListChecks className="h-3.5 w-3.5" />
                    {t("exerciseCount", { count: exerciseCount(plan) })}
                    {lastUsed.has(plan.id) && (
                      <> · {t("lastUsed", { date: lastUsed.get(plan.id)! })}</>
                    )}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-bone-dim transition-transform group-hover:translate-x-0.5" />
              </Link>
              <div className="flex items-center justify-end gap-1 border-t border-panel-border/70 px-3 py-1.5">
                <DuplicatePlanButton planId={plan.id} />
                <ArchivePlanButton planId={plan.id} archived={false} />
                <DeletePlanButton planId={plan.id} />
              </div>
            </Card>
          ))}

          {archivedPlans.length > 0 && (
            <>
              <p className="mt-4 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-bone-dim">
                <Archive className="h-3.5 w-3.5" />
                {t("archived")}
              </p>
              {archivedPlans.map((plan) => (
                <Card
                  key={plan.id}
                  className="flex items-center gap-3 p-4 opacity-60 transition-opacity hover:opacity-100"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-graphite text-bone-dim">
                    <Archive className="h-5 w-5" />
                  </span>
                  <Link
                    href={`/plans/${plan.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-0.5"
                  >
                    <span className="truncate font-medium text-bone">
                      {plan.name}
                    </span>
                    <span className="font-num text-xs tabular-nums text-bone-dim">
                      {t("exerciseCount", { count: exerciseCount(plan) })}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <ArchivePlanButton planId={plan.id} archived={true} />
                    <DeletePlanButton planId={plan.id} />
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
