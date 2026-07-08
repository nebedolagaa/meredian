import { TrendingDown, TrendingUp, Minus, Trophy } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightCard } from "@/components/insight/InsightCard";
import { VolumeChart } from "@/components/charts/VolumeChart";
import { FrequencyChart } from "@/components/charts/FrequencyChart";
import { MuscleVolumeChart } from "@/components/charts/MuscleVolumeChart";
import { ExerciseProgressChart } from "@/components/charts/ExerciseProgressChart";
import { ShareRecordButton } from "@/components/analytics/ShareRecordButton";
import { ConsistencyHeatmap } from "@/components/analytics/ConsistencyHeatmap";
import { BodyWeightCard } from "@/components/measurements/BodyWeightCard";
import { StreakCard } from "@/components/streak/StreakCard";
import { getAnalyticsData } from "@/lib/data/analytics";
import { getUserPreferences } from "@/lib/data/preferences";
import { toDisplayWeight, unitLabel } from "@/lib/utils/units";
import type { InsightType } from "@/lib/utils/insights";

export const dynamic = "force-dynamic";

const insightIcon = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

export default async function AnalyticsPage() {
  const supabase = createClient();
  const t = await getTranslations("analytics");
  const tInsights = await getTranslations("insights");
  const tBody = await getTranslations("bodyWeight");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { unit, weeklyGoal } = await getUserPreferences(supabase, user.id);
  const {
    insights,
    progressSeries,
    exerciseNames,
    records,
    frequencySeries,
    muscleVolume,
    streak,
    completedDates,
  } = await getAnalyticsData(supabase, user.id, weeklyGoal);
  const unitName = unitLabel(unit);

  const { data: measurementRows } = await supabase
    .from("body_measurements")
    .select("id, measured_on, weight_kg")
    .eq("user_id", user.id)
    .order("measured_on", { ascending: true });

  // Weight goal set during onboarding (migration 0010); read separately so a
  // missing column can't break the analytics page.
  const { data: goalWeightRow } = await supabase
    .from("profiles")
    .select("goal_weight_kg")
    .eq("id", user.id)
    .single();
  const goalWeight =
    goalWeightRow?.goal_weight_kg != null
      ? toDisplayWeight(goalWeightRow.goal_weight_kg, unit)
      : null;

  const measurements = (measurementRows ?? []).map((m) => ({
    id: m.id,
    date: m.measured_on,
    weight: toDisplayWeight(m.weight_kg, unit),
  }));

  // Last 30 days for the progress chart.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const recentProgress = progressSeries.filter((p) => p.date >= cutoffISO);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <StreakCard streak={streak} />

      <ConsistencyHeatmap dates={completedDates} />

      {/* Insights */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-3">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              type={insight.type as InsightType}
              message={tInsights(insight.messageKey, insight.params)}
              icon={insightIcon[insight.type]}
            />
          ))}
        </div>
      )}

      {/* Volume over time */}
      <Card>
        <CardHeader>
          <CardTitle>{t("volume")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("volumeDesc")}</p>
        </CardHeader>
        <CardContent>
          <VolumeChart data={recentProgress} />
          <div className="mt-3 flex items-center gap-4 text-[10px] text-bone-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-steel" /> {t("actual")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t border-dashed border-bone-dim" />{" "}
              {t("planned")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Exercise progress */}
      <Card>
        <CardHeader>
          <CardTitle>{t("exerciseProgress")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("exerciseProgressDesc")}</p>
        </CardHeader>
        <CardContent>
          <ExerciseProgressChart
            exerciseNames={exerciseNames}
            unit={unit}
            unitName={unitName}
          />
        </CardContent>
      </Card>

      {/* Training frequency */}
      <Card>
        <CardHeader>
          <CardTitle>{t("frequency")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("frequencyDesc")}</p>
        </CardHeader>
        <CardContent>
          <FrequencyChart
            data={frequencySeries}
            emptyLabel={t("frequencyEmpty")}
          />
        </CardContent>
      </Card>

      {/* Muscle group balance */}
      <Card>
        <CardHeader>
          <CardTitle>{t("muscleBalance")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("muscleBalanceDesc")}</p>
        </CardHeader>
        <CardContent>
          <MuscleVolumeChart
            data={muscleVolume}
            emptyLabel={t("frequencyEmpty")}
          />
        </CardContent>
      </Card>

      {/* Personal records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-moss" />
            {t("records")}
          </CardTitle>
          <p className="text-xs text-bone-dim">{t("recordsDesc")}</p>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="py-4 text-center text-sm text-bone-dim">
              {t("noRecords")}
            </p>
          ) : (
            <div className="divide-y divide-panel-border">
              {records.slice(0, 8).map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Link
                    href={`/exercise/${encodeURIComponent(r.name)}`}
                    className="min-w-0 flex-1 truncate text-sm text-bone transition-colors hover:text-steel"
                  >
                    {r.name}
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-num text-sm tabular-nums text-bone">
                      {toDisplayWeight(r.maxWeight, unit)} {unitName}
                      <span className="text-bone-dim"> ×{r.repsAtMax}</span>
                    </span>
                    <span className="font-num text-xs tabular-nums text-moss">
                      {t("oneRepMax", {
                        value: toDisplayWeight(r.bestOneRepMax, unit),
                        unit: unitName,
                      })}
                    </span>
                    <ShareRecordButton
                      name={r.name}
                      weight={toDisplayWeight(r.maxWeight, unit)}
                      reps={r.repsAtMax}
                      oneRepMax={toDisplayWeight(r.bestOneRepMax, unit)}
                      unit={unitName}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Body weight */}
      <Card>
        <CardHeader>
          <CardTitle>{tBody("title")}</CardTitle>
          <p className="text-xs text-bone-dim">{tBody("description")}</p>
        </CardHeader>
        <CardContent>
          <BodyWeightCard
            measurements={measurements}
            unit={unit}
            unitName={unitName}
            goalWeight={goalWeight}
          />
        </CardContent>
      </Card>
    </div>
  );
}
