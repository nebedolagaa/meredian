import { Flame, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { GoalCelebration } from "@/components/streak/GoalCelebration";
import type { StreakResult } from "@/lib/utils/streak";

/**
 * Retention-focused weekly streak summary: current run, best run, and this
 * week's progress toward the goal. Rendered on the dashboard and analytics.
 */
export async function StreakCard({ streak }: { streak: StreakResult }) {
  const t = await getTranslations("streak");
  const active = streak.current > 0;
  const pct =
    streak.goal > 0
      ? Math.min(100, Math.round((streak.thisWeekCount / streak.goal) * 100))
      : 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        {streak.metThisWeek && <GoalCelebration />}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors",
                active ? "bg-moss/15 text-moss" : "bg-carbon text-bone-dim",
              )}
            >
              <Flame className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-num text-2xl font-semibold tabular-nums text-bone">
                {t("weeks", { count: streak.current })}
              </span>
              <span className="text-xs text-bone-dim">
                {active ? t("keepGoing") : t("startCta")}
              </span>
            </div>
          </div>

          {streak.longest > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-1 font-num text-sm tabular-nums text-bone">
                <Trophy className="h-3.5 w-3.5 text-moss" />
                {streak.longest}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-bone-dim">
                {t("best")}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-bone-dim">
            <span>{t("thisWeek")}</span>
            <span className="font-num tabular-nums">
              {t("progress", {
                done: streak.thisWeekCount,
                goal: streak.goal,
              })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-carbon">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                streak.metThisWeek ? "bg-moss" : "bg-steel",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
