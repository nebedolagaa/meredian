"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBodyGoal } from "@/app/actions/profile";
import { toKg, toDisplayWeight, unitLabel } from "@/lib/utils/units";
import type { WeightUnit, Sex, GoalType } from "@/lib/types/database";

const GOALS: GoalType[] = ["lose_weight", "gain_muscle", "burn_fat"];

export function BodyGoalForm({
  unit,
  initialSex,
  initialHeightCm,
  initialGoalType,
  initialGoalWeightKg,
}: {
  unit: WeightUnit;
  initialSex: Sex | null;
  initialHeightCm: number | null;
  initialGoalType: GoalType | null;
  initialGoalWeightKg: number | null;
}) {
  const t = useTranslations("onboardingWizard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [sex, setSex] = useState<Sex | null>(initialSex);
  const [heightCm, setHeightCm] = useState(
    initialHeightCm != null ? String(initialHeightCm) : "",
  );
  const [goalType, setGoalType] = useState<GoalType | null>(initialGoalType);
  const [goalWeight, setGoalWeight] = useState(
    initialGoalWeightKg != null
      ? String(toDisplayWeight(initialGoalWeightKg, unit))
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaving(true);
    setSaved(false);
    const heightNum = Number(heightCm);
    const goalWeightNum = Number(goalWeight);
    const result = await updateBodyGoal({
      sex,
      heightCm: heightNum > 0 ? heightNum : null,
      goalType,
      goalWeightKg: goalWeightNum > 0 ? toKg(goalWeightNum, unit) : null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* sex */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("sex.title")}</Label>
        <div className="inline-flex w-fit rounded-lg border border-panel-border bg-carbon p-1">
          {(["male", "female"] as const).map((value) => {
            const active = sex === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSaved(false);
                  setSex(active ? null : value);
                }}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-steel text-carbon"
                    : "text-bone-dim hover:text-bone",
                )}
              >
                {t(`sex.${value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* height */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="body-height">{t("height.title")}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="body-height"
            type="number"
            inputMode="numeric"
            min={1}
            max={300}
            value={heightCm}
            onChange={(e) => {
              setSaved(false);
              setHeightCm(e.target.value);
            }}
            className="w-24 font-num tabular-nums"
          />
          <span className="text-xs text-bone-dim">{t("height.cm")}</span>
        </div>
      </div>

      {/* goal */}
      <div className="flex flex-col gap-1.5">
        <Label>{t("goal.title")}</Label>
        <div className="inline-flex w-fit flex-wrap rounded-lg border border-panel-border bg-carbon p-1">
          {GOALS.map((value) => {
            const active = goalType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSaved(false);
                  setGoalType(active ? null : value);
                }}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-steel text-carbon"
                    : "text-bone-dim hover:text-bone",
                )}
              >
                {t(`goal.${value}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* goal weight */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-weight-settings">{t("goal.targetWeight")}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="goal-weight-settings"
            type="number"
            inputMode="decimal"
            min={1}
            step={0.1}
            value={goalWeight}
            onChange={(e) => {
              setSaved(false);
              setGoalWeight(e.target.value);
            }}
            className="w-24 font-num tabular-nums"
          />
          <span className="text-xs text-bone-dim">{unitLabel(unit)}</span>
          <Button onClick={save} disabled={saving} variant="outline" size="sm">
            {saving
              ? tCommon("saving")
              : saved
                ? tCommon("saved")
                : tCommon("save")}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
