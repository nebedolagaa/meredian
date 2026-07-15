"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  GripVertical,
  Link2,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { BodyMap, MUSCLE_COLORS } from "@/components/exercises/BodyMap";
import {
  ExercisePicker,
  ExerciseRow,
} from "@/components/exercises/ExercisePicker";
import {
  ExercisePreviewSheet,
  ExerciseThumb,
} from "@/components/exercises/ExercisePreview";
import { listExercises } from "@/app/actions/exercises";
import { savePlan, type PlanExerciseInput } from "@/app/actions/plans";
import type { Exercise, PrimaryMuscle, Sex } from "@/lib/types/database";
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
  rest_seconds?: number | null;
  muscle_group?: string | null;
  exercise_type?: string | null;
  equipment?: string | null;
  location?: string | null;
  gif_url?: string | null;
  description?: string | null;
  primary_muscle?: string | null;
  /**
   * Superset link, anchored to the previous row's key. Anchoring to the KEY
   * (not a boolean) means the link silently dissolves when rows are
   * reordered or the partner is deleted, instead of chaining to whatever row
   * happens to land above.
   */
  supersetWithKey?: string | null;
}

/** Is this row actively chained with the row currently above it? */
function isLinkedWithPrev(rows: Row[], index: number): boolean {
  return index > 0 && rows[index].supersetWithKey === rows[index - 1].key;
}

/** Turn "linked with previous" chains into numbered superset groups. */
function computeSupersetGroups(rows: Row[]): (number | null)[] {
  const groups: (number | null)[] = [];
  let nextGroup = 1;
  for (let i = 0; i < rows.length; i++) {
    if (isLinkedWithPrev(rows, i)) {
      const prev = groups[i - 1];
      if (prev !== null) {
        groups.push(prev);
      } else {
        groups[i - 1] = nextGroup;
        groups.push(nextGroup);
        nextGroup++;
      }
    } else {
      groups.push(null);
    }
  }
  return groups;
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
  sex = "male",
  templatePicker,
}: {
  initial: PlanBuilderInitial;
  unit?: WeightUnit;
  sex?: Sex;
  templatePicker?: ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("planBuilder");
  const tc = useTranslations("exerciseCatalog");
  const tmus = useTranslations("muscles");
  const reducedMotion = useReducedMotion();
  const [name, setName] = useState(initial.name);
  const [rows, setRows] = useState<Row[]>(initial.rows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise catalog + body-map muscle selection, shared with the picker.
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);
  const [muscles, setMuscles] = useState<string[]>([]);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listExercises().then((data) => {
      if (!cancelled) setCatalog(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleMuscle(m: PrimaryMuscle) {
    setMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  const suggestions =
    muscles.length > 0
      ? (catalog ?? []).filter(
          (ex) => ex.primary_muscle && muscles.includes(ex.primary_muscle),
        )
      : [];

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
        muscle_group: ex.muscle_group,
        exercise_type: ex.exercise_type,
        equipment: ex.equipment,
        location: ex.location,
        gif_url: ex.gif_url,
        description: ex.description,
        primary_muscle: ex.primary_muscle,
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
    const supersetGroups = computeSupersetGroups(rows);
    const exercises: PlanExerciseInput[] = rows.map((r, i) => ({
      exercise_id: r.exercise_id,
      target_sets: r.target_sets,
      target_reps: r.target_reps,
      target_weight: r.target_weight,
      rest_seconds: r.rest_seconds ?? null,
      superset_group: supersetGroups[i],
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

      <div className="flex flex-col gap-1.5" data-tour="plan-name">
        <Label htmlFor="plan-name">{t("planName")}</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("planNamePlaceholder")}
        />
      </div>

      {templatePicker && !initial.id && (
        <section className="rounded-2xl border border-panel-border bg-graphite p-4">
          <button
            type="button"
            onClick={() => setTemplateOpen((v) => !v)}
            aria-expanded={templateOpen}
            className="text-sm font-medium text-bone hover:text-bone-dim"
          >
            {t("startFromTemplate")}
          </button>
          {templateOpen && <div className="mt-3">{templatePicker}</div>}
        </section>
      )}

      {/* What do you want to train? — interactive body map */}
      <section className="flex flex-col gap-4 rounded-2xl border border-panel-border bg-graphite p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold text-bone">
            {tc("trainTitle")}
          </h2>
          <p className="text-xs text-bone-dim">{tc("trainHint")}</p>
        </div>

        <BodyMap sex={sex} selected={muscles} onToggle={toggleMuscle} />

        {muscles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {muscles.map((m) => {
              const color = MUSCLE_COLORS[m as PrimaryMuscle];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMuscle(m as PrimaryMuscle)}
                  aria-label={`${tc("clear")} ${tmus(m)}`}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{
                    borderColor: color,
                    backgroundColor: `${color}26`,
                    color,
                  }}
                >
                  {tmus(m)}
                  <X className="h-3 w-3" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMuscles([])}
              className="px-1 text-xs text-bone-dim hover:text-bone"
            >
              {tc("clear")}
            </button>
          </div>
        )}

        {muscles.length > 0 && (
          <div className="flex flex-col gap-2">
            {catalog === null ? (
              <p className="py-2 text-center text-xs text-bone-dim">
                {tc("loading")}
              </p>
            ) : suggestions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-panel-border py-4 text-center text-xs text-bone-dim">
                {tc("noMuscleMatches")}
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {suggestions.map((ex) => (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    added={rows.some((r) => r.exercise_id === ex.id)}
                    onOpen={() => setPreview(ex)}
                    onAdd={() => addExercise(ex)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <ExercisePicker
        exercises={catalog}
        onExercisesChange={setCatalog}
        muscles={muscles}
        onMusclesChange={setMuscles}
        onSelect={addExercise}
      />

      <ExercisePreviewSheet
        exercise={preview}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      />

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-panel-border py-8 text-center text-sm text-bone-dim">
            {t("noExercises")}
          </p>
        )}

        {reducedMotion ? (
          rows.map((row, index) => (
            <PlanRowCard
              key={row.key}
              row={row}
              index={index}
              rowsLength={rows.length}
              prevKey={index > 0 ? rows[index - 1].key : null}
              unit={unit}
              draggable={false}
              t={t}
              onUpdate={update}
              onRemove={remove}
              onMove={move}
            />
          ))
        ) : (
          <Reorder.Group
            as="div"
            axis="y"
            values={rows}
            onReorder={setRows}
            className="flex flex-col gap-3"
          >
            {rows.map((row, index) => (
              <PlanRowCard
                key={row.key}
                row={row}
                index={index}
                rowsLength={rows.length}
                prevKey={index > 0 ? rows[index - 1].key : null}
                unit={unit}
                draggable
                t={t}
                onUpdate={update}
                onRemove={remove}
                onMove={move}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <Button onClick={onSave} disabled={saving}>
        <Save className="h-4 w-4" />
        {saving ? t("saving") : t("savePlan")}
      </Button>
    </div>
  );
}

function PlanRowCard({
  row,
  index,
  rowsLength,
  prevKey,
  unit,
  draggable,
  t,
  onUpdate,
  onRemove,
  onMove,
}: {
  row: Row;
  index: number;
  rowsLength: number;
  /** Key of the row currently above — anchors the superset link. */
  prevKey: string | null;
  unit: WeightUnit;
  draggable: boolean;
  t: ReturnType<typeof useTranslations>;
  onUpdate: (key: string, patch: Partial<Row>) => void;
  onRemove: (key: string) => void;
  onMove: (index: number, delta: number) => void;
}) {
  const controls = useDragControls();

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {draggable && (
            <button
              type="button"
              aria-label={t("dragToReorder")}
              onPointerDown={(e) => controls.start(e)}
              className="cursor-grab touch-none rounded-md p-1 text-bone-dim hover:text-bone active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <ExerciseThumb ex={row} className="h-10 w-10" />
          <span className="truncate text-sm font-medium text-bone">
            {row.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {prevKey && (
            <button
              type="button"
              aria-label={t("supersetWithPrev")}
              aria-pressed={row.supersetWithKey === prevKey}
              title={t("supersetWithPrev")}
              onClick={() =>
                onUpdate(row.key, {
                  supersetWithKey:
                    row.supersetWithKey === prevKey ? null : prevKey,
                })
              }
              className={cn(
                "rounded-md p-1.5 transition-colors",
                row.supersetWithKey === prevKey
                  ? "text-steel"
                  : "text-bone-dim hover:text-bone",
              )}
            >
              <Link2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label={t("moveUp")}
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="rounded-md p-1.5 text-bone-dim hover:text-bone disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("moveDown")}
            onClick={() => onMove(index, 1)}
            disabled={index === rowsLength - 1}
            className="rounded-md p-1.5 text-bone-dim hover:text-bone disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("deleteExercise")}
            onClick={() => onRemove(row.key)}
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
          onChange={(v) => onUpdate(row.key, { target_sets: v })}
        />
        <NumberField
          label={t("reps")}
          value={row.target_reps}
          onChange={(v) => onUpdate(row.key, { target_reps: v })}
        />
        <WeightField
          label={t("weight", { unit: unitLabel(unit) })}
          value={toDisplayWeight(row.target_weight, unit)}
          onChange={(v) =>
            onUpdate(row.key, { target_weight: toKg(v, unit) })
          }
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-[10px]">{t("restSeconds")}</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={600}
          step={15}
          placeholder={t("restSecondsAuto")}
          value={row.rest_seconds ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            onUpdate(row.key, {
              rest_seconds:
                raw === "" ? null : Math.max(0, Math.min(600, Number(raw) || 0)),
            });
          }}
          className="font-num tabular-nums"
        />
      </div>
    </>
  );

  if (draggable) {
    return (
      <Reorder.Item
        as="div"
        value={row}
        dragListener={false}
        dragControls={controls}
        className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-graphite p-4"
      >
        {content}
      </Reorder.Item>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-panel-border bg-graphite p-4">
      {content}
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
