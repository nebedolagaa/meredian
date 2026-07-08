"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Scale,
  Ruler,
  Target,
  Gauge,
  Dumbbell,
  PencilRuler,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/layout/Wordmark";
import { TemplatePicker } from "@/components/plans/TemplatePicker";
import { startGuidedTour } from "@/components/tour/GuidedTour";
import { completeOnboarding } from "@/app/actions/onboarding";
import { toKg } from "@/lib/utils/units";
import {
  TRAINING_LEVELS,
  type WeightUnit,
  type Sex,
  type GoalType,
  type TrainingLevel,
} from "@/lib/types/database";

const TOTAL_STEPS = 7;

const GOALS: GoalType[] = ["lose_weight", "gain_muscle", "burn_fat"];

function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 30.48 + inches * 2.54) * 10) / 10;
}

export function OnboardingWizard({ initialUnit }: { initialUnit: WeightUnit }) {
  const t = useTranslations("onboardingWizard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [unit, setUnit] = useState<WeightUnit>(initialUnit);
  const [sex, setSex] = useState<Sex | null>(null);
  const [weight, setWeight] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [goalWeight, setGoalWeight] = useState("");
  const [level, setLevel] = useState<TrainingLevel | null>(null);
  const [saved, setSaved] = useState(false);

  const weightNum = Number(weight);
  const goalWeightNum = Number(goalWeight);
  const resolvedHeightCm =
    unit === "lb"
      ? ftInToCm(Number(heightFt) || 0, Number(heightIn) || 0)
      : Number(heightCm);

  const stepValid = (() => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return true; // sex is optional
      case 3:
        return weightNum > 0 && toKg(weightNum, unit) <= 1000;
      case 4:
        return resolvedHeightCm > 0 && resolvedHeightCm <= 300;
      case 5:
        return level !== null;
      case 6:
        return (
          goalType !== null &&
          goalWeightNum > 0 &&
          toKg(goalWeightNum, unit) <= 1000
        );
      default:
        return true;
    }
  })();

  function next() {
    setError(null);
    if (step === 6) {
      // Persist steps 1–6 before showing the first-workout step so that
      // skipping step 7 loses nothing.
      startTransition(async () => {
        const result = await completeOnboarding({
          unit,
          sex,
          weightKg: toKg(weightNum, unit),
          heightCm: resolvedHeightCm,
          goalType: goalType!,
          goalWeightKg: toKg(goalWeightNum, unit),
          trainingLevel: level,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved(true);
        // Arm the in-app guided tour; it picks up once the user lands in the app.
        startGuidedTour();
        setStep(7);
      });
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  const weightUnitLabel = unit === "lb" ? t("units.lb") : t("units.kg");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4">
        <Wordmark />
        {/* progress */}
        <div className="flex w-full items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-steel" : "bg-panel-border",
              )}
            />
          ))}
        </div>
        <p className="text-xs text-bone-dim">
          {t("stepOf", { step, total: TOTAL_STEPS })}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-panel-border bg-graphite p-5">
        {step === 1 && (
          <StepShell
            icon={<Scale className="h-5 w-5 text-steel" />}
            title={t("units.title")}
            description={t("units.description")}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["kg", "lb"] as const).map((value) => (
                <OptionCard
                  key={value}
                  active={unit === value}
                  onClick={() => setUnit(value)}
                  label={t(`units.${value}`)}
                  hint={t(`units.${value}Hint`)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            icon={<Target className="h-5 w-5 text-steel" />}
            title={t("sex.title")}
            description={t("sex.description")}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((value) => (
                <OptionCard
                  key={value}
                  active={sex === value}
                  onClick={() => setSex(value)}
                  label={t(`sex.${value}`)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSex(null)}
              className={cn(
                "self-start text-xs underline-offset-2 hover:underline",
                sex === null ? "text-bone" : "text-bone-dim",
              )}
            >
              {t("sex.preferNot")}
            </button>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            icon={<Scale className="h-5 w-5 text-steel" />}
            title={t("weight.title")}
            description={t("weight.description")}
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                step={0.1}
                autoFocus
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={unit === "lb" ? "165" : "75"}
                className="font-num tabular-nums"
                aria-label={t("weight.title")}
              />
              <span className="text-sm text-bone-dim">{weightUnitLabel}</span>
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell
            icon={<Ruler className="h-5 w-5 text-steel" />}
            title={t("height.title")}
            description={t("height.description")}
          >
            {unit === "lb" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={8}
                  autoFocus
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  placeholder="5"
                  className="font-num tabular-nums"
                  aria-label={t("height.ft")}
                />
                <span className="text-sm text-bone-dim">{t("height.ft")}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={11}
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  placeholder="9"
                  className="font-num tabular-nums"
                  aria-label={t("height.in")}
                />
                <span className="text-sm text-bone-dim">{t("height.in")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={300}
                  autoFocus
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  className="font-num tabular-nums"
                  aria-label={t("height.cm")}
                />
                <span className="text-sm text-bone-dim">{t("height.cm")}</span>
              </div>
            )}
          </StepShell>
        )}

        {step === 5 && (
          <StepShell
            icon={<Gauge className="h-5 w-5 text-steel" />}
            title={t("level.title")}
            description={t("level.description")}
          >
            <div className="grid grid-cols-1 gap-2">
              {TRAINING_LEVELS.map((value) => (
                <OptionCard
                  key={value}
                  active={level === value}
                  onClick={() => setLevel(value)}
                  label={t(`level.${value}`)}
                  hint={t(`level.${value}Desc`)}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 6 && (
          <StepShell
            icon={<Target className="h-5 w-5 text-steel" />}
            title={t("goal.title")}
            description={t("goal.description")}
          >
            <div className="grid grid-cols-1 gap-2">
              {GOALS.map((value) => (
                <OptionCard
                  key={value}
                  active={goalType === value}
                  onClick={() => setGoalType(value)}
                  label={t(`goal.${value}`)}
                  hint={t(`goal.${value}Desc`)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-weight">{t("goal.targetWeight")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="goal-weight"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step={0.1}
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder={unit === "lb" ? "155" : "70"}
                  className="font-num tabular-nums"
                />
                <span className="text-sm text-bone-dim">{weightUnitLabel}</span>
              </div>
            </div>
          </StepShell>
        )}

        {step === 7 && (
          <StepShell
            icon={<Dumbbell className="h-5 w-5 text-steel" />}
            title={t("firstWorkout.title")}
            description={t("firstWorkout.description")}
          >
            <TemplatePicker />
            <button
              type="button"
              onClick={() => {
                router.push("/plans/new");
                router.refresh();
              }}
              className="flex items-center gap-3 rounded-lg border border-panel-border bg-carbon px-3 py-2.5 text-left transition-colors hover:border-steel"
            >
              <PencilRuler className="h-4 w-4 shrink-0 text-steel" />
              <div className="flex flex-1 flex-col">
                <span className="text-sm text-bone">
                  {t("firstWorkout.manual")}
                </span>
                <span className="text-xs text-bone-dim">
                  {t("firstWorkout.manualDesc")}
                </span>
              </div>
              <LayoutTemplate className="h-4 w-4 shrink-0 text-bone-dim" />
            </button>
          </StepShell>
        )}

        {error && <p className="text-xs text-clay">{error}</p>}
      </div>

      <div className="flex items-center justify-between">
        {step > 1 && step < 7 ? (
          <Button variant="ghost" onClick={back} disabled={pending}>
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>
        ) : (
          <span />
        )}
        {step < 7 ? (
          <Button onClick={next} disabled={!stepValid || pending}>
            {pending ? t("saving") : step === 6 ? t("finish") : t("next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
            disabled={!saved}
          >
            {t("firstWorkout.skip")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StepShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-base font-semibold text-bone">{title}</h1>
        </div>
        <p className="text-xs text-bone-dim">{description}</p>
      </div>
      {children}
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-steel bg-carbon"
          : "border-panel-border bg-carbon hover:border-steel/50",
      )}
    >
      <span className={cn("text-sm", active ? "text-bone" : "text-bone-dim")}>
        {label}
      </span>
      {hint && <span className="text-xs text-bone-dim">{hint}</span>}
    </button>
  );
}
