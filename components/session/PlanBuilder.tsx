"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExerciseSearch } from "@/components/session/ExerciseSearch";
import { savePlan, type PlanExerciseInput } from "@/app/actions/plans";
import type { Exercise } from "@/lib/types/database";
import {
  toDisplayWeight,
  toKg,
  unitLabel,
  type WeightUnit,
} from "@/lib/utils/units";

interface Row {
  key: string;
  exercise_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
}

export interface PlanBuilderInitial {
  id: string | null;
  name: string;
  rows: Row[];
}

let keyCounter = 0;
const nextKey = () => `row-${Date.now()}-${keyCounter++}`;

export function PlanBuilder({
  initial,
  unit = "kg",
}: {
  initial: PlanBuilderInitial;
  unit?: WeightUnit;
}) {
  const router = useRouter();
  const t = useTranslations("planBuilder");
  const [name, setName] = useState(initial.name);
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addExercise(ex: Exercise) {
    setRows((r) => [
      ...r,
      {
        key: nextKey(),
        exercise_id: ex.id,
        name: ex.name,
        target_sets: 3,
        target_reps: 10,
        target_weight: 20,
      },
    ]);
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((r) =>
      r.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function remove(key: string) {
    setRows((r) => r.filter((row) => row.key !== key));
  }

  function move(index: number, delta: number) {
    setRows((r) => {
      const target = index + delta;
      if (target < 0 || target >= r.length) return r;
      const copy = [...r];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function onSave() {
    setError(null);
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setSaving(true);
    const exercises: PlanExerciseInput[] = rows.map((r) => ({
      exercise_id: r.exercise_id,
      target_sets: r.target_sets,
      target_reps: r.target_reps,
      target_weight: r.target_weight,
    }));
    const result = await savePlan(initial.id, name, exercises);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/plans");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        title={initial.id ? t("editPlan") : t("newPlan")}
        backHref="/plans"
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="plan-name">{t("planName")}</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("planNamePlaceholder")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("addExercise")}</Label>
        <ExerciseSearch onSelect={addExercise} />
      </div>

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-panel-border py-8 text-center text-sm text-bone-dim">
            {t("noExercises")}
          </p>
        )}

        {rows.map((row, index) => (
          <div
            key={row.key}
            className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-graphite p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-bone">{row.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t("moveUp")}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-md p-1.5 text-bone-dim hover:text-bone disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("moveDown")}
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  className="rounded-md p-1.5 text-bone-dim hover:text-bone disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("deleteExercise")}
                  onClick={() => remove(row.key)}
                  className="rounded-md p-1.5 text-clay hover:bg-clay/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label={t("sets")}
                value={row.target_sets}
                onChange={(v) => update(row.key, { target_sets: v })}
              />
              <NumberField
                label={t("reps")}
                value={row.target_reps}
                onChange={(v) => update(row.key, { target_reps: v })}
              />
              <WeightField
                label={t("weight", { unit: unitLabel(unit) })}
                value={toDisplayWeight(row.target_weight, unit)}
                onChange={(v) =>
                  update(row.key, { target_weight: toKg(v, unit) })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <Button onClick={onSave} disabled={saving}>
        <Save className="h-4 w-4" />
        {saving ? t("saving") : t("savePlan")}
      </Button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px]">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="font-num tabular-nums"
      />
    </div>
  );
}

/**
 * Weight field with quick ±2.5 increments to nudge progressive overload.
 */
function WeightField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const bump = (delta: number) =>
    onChange(Math.max(0, Math.round((value + delta) * 10) / 10));
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px]">{label}</Label>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label="-2.5"
          onClick={() => bump(-2.5)}
          className="shrink-0 rounded-md border border-panel-border px-1.5 text-xs text-bone-dim hover:text-bone"
        >
          −
        </button>
        <Input
          type="number"
          inputMode="decimal"
          step={0.5}
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="font-num tabular-nums"
        />
        <button
          type="button"
          aria-label="+2.5"
          onClick={() => bump(2.5)}
          className="shrink-0 rounded-md border border-panel-border px-1.5 text-xs text-bone-dim hover:text-bone"
        >
          +
        </button>
      </div>
    </div>
  );
}
