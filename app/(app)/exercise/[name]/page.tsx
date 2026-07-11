import { Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseHistoryChart } from "@/components/charts/ExerciseHistoryChart";
import { getAnalyticsData, getExerciseProgress } from "@/lib/data/analytics";
import { getUserPreferences } from "@/lib/data/preferences";
import { toDisplayWeight, unitLabel } from "@/lib/utils/units";

export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const supabase = await createClient();
  const t = await getTranslations("exerciseHistory");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const name = decodeURIComponent(rawName);
  const { unit } = await getUserPreferences(supabase, user.id);
  const unitName = unitLabel(unit);

  const [rawPoints, { records }] = await Promise.all([
    getExerciseProgress(supabase, user.id, name),
    getAnalyticsData(supabase, user.id),
  ]);

  const points = rawPoints.map((p) => ({
    date: p.date,
    weight: toDisplayWeight(p.weight, unit),
  }));
  const record = records.find((r) => r.name === name);

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title={name} backHref="/analytics" />

      {record && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-moss" />
              {t("personalRecord")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-bone-dim">{t("max")}</span>
              <span className="font-num text-lg tabular-nums text-bone">
                {toDisplayWeight(record.maxWeight, unit)} {unitName}
                <span className="text-sm text-bone-dim">
                  {" "}
                  ×{record.repsAtMax}
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-xs text-bone-dim">{t("oneRepMax")}</span>
              <span className="font-num text-lg tabular-nums text-moss">
                {toDisplayWeight(record.bestOneRepMax, unit)} {unitName}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("progress")}</CardTitle>
          <p className="text-xs text-bone-dim">
            {t("sessions", { count: points.length })}
          </p>
        </CardHeader>
        <CardContent>
          <ExerciseHistoryChart points={points} unitName={unitName} />
        </CardContent>
      </Card>
    </div>
  );
}
