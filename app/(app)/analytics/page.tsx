import {
  TrendingDown,
  TrendingUp,
  Minus,
  Trophy,
  Dumbbell,
  History,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoHint } from "@/components/ui/InfoHint";
import { InsightCard } from "@/components/insight/InsightCard";
import { VolumeChart } from "@/components/charts/VolumeChart";
import { FrequencyChart } from "@/components/charts/FrequencyChart";
import { MuscleVolumeChart } from "@/components/charts/MuscleVolumeChart";
import { ExerciseProgressChart } from "@/components/charts/ExerciseProgressChart";
import { ShareRecordButton } from "@/components/analytics/ShareRecordButton";
import { ConsistencyHeatmap } from "@/components/analytics/ConsistencyHeatmap";
import { BodyWeightCard } from "@/components/measurements/BodyWeightCard";
import { BodyMap } from "@/components/exercises/BodyMap";
import { getAnalyticsData } from "@/lib/data/analytics";
import { getUserPreferences } from "@/lib/data/preferences";
import { toDisplayWeight, unitLabel } from "@/lib/utils/units";
import { shortDate } from "@/lib/utils/dates";
import type { InsightType } from "@/lib/utils/insights";

export const dynamic = "force-dynamic";

const insightIcon = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

export default async function AnalyticsPage() {
  const supabase = await createClient();
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
    recordTimeline,
    frequencySeries,
    muscleVolume,
    muscleIntensity,
    completedDates,
  } = await getAnalyticsData(supabase, user.id, weeklyGoal);
  const unitName = unitLabel(unit);

  // Sex for the body map silhouette (migration 0010); read separately so a
  // missing column can't break the analytics page.
  const { data: sexRow } = await supabase
    .from("profiles")
    .select("sex")
    .eq("id", user.id)
    .single();

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

  // Girths (migration 0019) — read separately so a missing column can't
  // break the analytics page.
  const girthsById = new Map<
    string,
    { waist_cm: number | null; chest_cm: number | null; arm_cm: number | null }
  >();
  const { data: girthRows } = await supabase
    .from("body_measurements")
    .select("id, waist_cm, chest_cm, arm_cm")
    .eq("user_id", user.id);
  for (const g of girthRows ?? []) girthsById.set(g.id, g);

  const measurements = (measurementRows ?? []).map((m) => ({
    id: m.id,
    date: m.measured_on,
    weight: toDisplayWeight(m.weight_kg, unit),
    waistCm: girthsById.get(m.id)?.waist_cm ?? null,
    chestCm: girthsById.get(m.id)?.chest_cm ?? null,
    armCm: girthsById.get(m.id)?.arm_cm ?? null,
  }));

  // Last 30 days for the progress chart.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const recentProgress = progressSeries.filter((p) => p.date >= cutoffISO);

  // Before the first completed session every card is a separate "no data"
  // shell — show one clear empty state with a call to action instead.
  // Body-weight entries count as data: this page hosts their input form.
  const hasAnyData =
    completedDates.length > 0 ||
    progressSeries.length > 0 ||
    records.length > 0 ||
    measurements.length > 0;
  if (!hasAnyData) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-steel/10 text-steel">
              <Dumbbell className="h-7 w-7" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium text-bone">{t("emptyTitle")}</p>
              <p className="max-w-[32ch] text-sm text-bone-dim">
                {t("emptyBody")}
              </p>
            </div>
            <Link
              href="/plans"
              className="rounded-xl bg-steel px-4 py-2 text-sm font-medium text-carbon transition-transform active:scale-95"
            >
              {t("emptyCta")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = [
    { id: "overview", label: t("sectionOverview") },
    { id: "charts", label: t("sectionCharts") },
    { id: "records", label: t("sectionRecords") },
    { id: "body", label: t("sectionBody") },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Section chips — quick jumps through a long page */}
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="shrink-0 rounded-full border border-panel-border px-3 py-1.5 text-xs text-bone-dim transition-colors hover:border-steel/40 hover:text-bone"
          >
            {s.label}
          </a>
        ))}
        <Link
          href="/history"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-panel-border px-3 py-1.5 text-xs text-bone-dim transition-colors hover:border-steel/40 hover:text-bone"
        >
          <History className="h-3 w-3" />
          {t("historyLink")}
        </Link>
      </nav>

      {/* Streak lives on the dashboard; the heatmap owns "consistency" here. */}
      <div id="overview" className="flex scroll-mt-4 flex-col gap-6">
        <ConsistencyHeatmap dates={completedDates} />
      </div>

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

      <div id="charts" className="flex scroll-mt-4 flex-col gap-6">
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
            emptyLabel={t("muscleBalanceEmpty")}
          />
        </CardContent>
      </Card>

      {/* Muscle recovery / recently trained body map */}
      <Card>
        <CardHeader>
          <CardTitle>{t("muscleMap")}</CardTitle>
          <p className="text-xs text-bone-dim">{t("muscleMapDesc")}</p>
        </CardHeader>
        <CardContent>
          {Object.keys(muscleIntensity).length === 0 ? (
            <EmptyState icon={Dumbbell} message={t("muscleBalanceEmpty")} />
          ) : (
            <BodyMap sex={sexRow?.sex ?? "male"} intensities={muscleIntensity} />
          )}
        </CardContent>
      </Card>
      </div>

      <div id="records" className="flex scroll-mt-4 flex-col gap-6">
      {/* Personal records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-moss" />
            {t("records")}
            <InfoHint text={t("oneRepMaxHint")} />
          </CardTitle>
          <p className="text-xs text-bone-dim">{t("recordsDesc")}</p>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState icon={Trophy} message={t("noRecords")} />
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

      {/* PR timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-moss" />
            {t("prTimeline")}
          </CardTitle>
          <p className="text-xs text-bone-dim">{t("prTimelineDesc")}</p>
        </CardHeader>
        <CardContent>
          {recordTimeline.length === 0 ? (
            <EmptyState icon={Trophy} message={t("noRecords")} />
          ) : (
            <div className="divide-y divide-panel-border">
              {recordTimeline.slice(0, 10).map((ev, i) => (
                <div
                  key={`${ev.name}-${ev.date}-${i}`}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-bone">
                      {ev.name}
                    </span>
                    <span className="font-num text-[10px] tabular-nums text-bone-dim">
                      {shortDate(ev.date)}
                    </span>
                  </div>
                  <span className="font-num text-sm tabular-nums text-moss">
                    {t("oneRepMax", {
                      value: toDisplayWeight(ev.oneRepMax, unit),
                      unit: unitName,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Body weight */}
      <Card id="body" className="scroll-mt-4">
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
