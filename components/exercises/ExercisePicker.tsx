"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createCustomExercise } from "@/app/actions/exercises";
import {
  MUSCLE_GROUPS,
  PRIMARY_MUSCLES,
  EXERCISE_TYPES,
  EQUIPMENT_VALUES,
  EXERCISE_LOCATIONS,
  type Exercise,
} from "@/lib/types/database";
import {
  ExerciseDetails,
  ExerciseGif,
  ExerciseRecommendation,
  ExerciseTags,
  gifSrc,
} from "@/components/exercises/ExercisePreview";
import { MUSCLE_COLORS } from "@/components/exercises/BodyMap";

interface Filters {
  type: string | null;
  equipment: string | null;
  location: string | null;
}

const NO_FILTERS: Filters = {
  type: null,
  equipment: null,
  location: null,
};

/**
 * Exercise library picker: full catalog with search, category filters and
 * animated technique previews. Selected exercises are added to the plan
 * without closing the sheet, so several can be picked in one go.
 * The muscle filter is controlled from outside so the body-map selection
 * in the plan builder stays in sync with the picker.
 */
export function ExercisePicker({
  exercises,
  onExercisesChange,
  muscles,
  onMusclesChange,
  onSelect,
}: {
  exercises: Exercise[] | null;
  onExercisesChange: (list: Exercise[]) => void;
  muscles: string[];
  onMusclesChange: (muscles: string[]) => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const t = useTranslations("exerciseCatalog");
  const tm = useTranslations("muscles");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setFilters(NO_FILTERS);
      setDetail(null);
      setAddedIds(new Set());
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exercises ?? []).filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (
        muscles.length > 0 &&
        (!ex.primary_muscle || !muscles.includes(ex.primary_muscle))
      )
        return false;
      if (filters.type && ex.exercise_type !== filters.type) return false;
      if (filters.equipment && ex.equipment !== filters.equipment) return false;
      if (filters.location && ex.location !== filters.location) return false;
      return true;
    });
  }, [exercises, query, filters, muscles]);

  const activeCount =
    Object.values(filters).filter(Boolean).length + muscles.length;

  const exactMatch = useMemo(
    () =>
      (exercises ?? []).some(
        (ex) => ex.name.toLowerCase() === query.trim().toLowerCase(),
      ),
    [exercises, query],
  );

  function toggle(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));
  }

  function toggleMuscle(m: string) {
    onMusclesChange(
      muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m],
    );
  }

  function add(ex: Exercise) {
    onSelect(ex);
    setAddedIds((s) => {
      const next = new Set(s);
      next.add(ex.id);
      return next;
    });
  }

  async function addCustom() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    const result = await createCustomExercise(name);
    setCreating(false);
    if (result.exercise) {
      onExercisesChange([...(exercises ?? []), result.exercise]);
      add(result.exercise);
      setQuery("");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => handleOpenChange(true)}
      >
        <Plus className="h-4 w-4" />
        {t("addExercise")}
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-[88dvh] flex-col gap-0 overflow-hidden p-0"
        >
          {detail ? (
            <DetailView
              exercise={detail}
              added={addedIds.has(detail.id)}
              onBack={() => setDetail(null)}
              onAdd={() => add(detail)}
            />
          ) : (
            <>
              {/* Header: title + search */}
              <div className="flex flex-col gap-3 px-5 pb-3 pt-5">
                <SheetTitle>{t("title")}</SheetTitle>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bone-dim" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="bg-carbon pl-9"
                  />
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex flex-col gap-2 pb-3">
                <ChipRow>
                  <Chip
                    active={muscles.length === 0}
                    onClick={() => onMusclesChange([])}
                  >
                    {t("all")}
                  </Chip>
                  {PRIMARY_MUSCLES.map((m) => (
                    <Chip
                      key={m}
                      active={muscles.includes(m)}
                      color={MUSCLE_COLORS[m]}
                      onClick={() => toggleMuscle(m)}
                    >
                      {tm(m)}
                    </Chip>
                  ))}
                </ChipRow>
                <ChipRow>
                  {EXERCISE_LOCATIONS.map((l) => (
                    <Chip
                      key={l}
                      active={filters.location === l}
                      onClick={() => toggle("location", l)}
                    >
                      {t(`location.${l}`)}
                    </Chip>
                  ))}
                  <ChipDivider />
                  {EQUIPMENT_VALUES.map((eq) => (
                    <Chip
                      key={eq}
                      active={filters.equipment === eq}
                      onClick={() => toggle("equipment", eq)}
                    >
                      {t(`equipment.${eq}`)}
                    </Chip>
                  ))}
                  <ChipDivider />
                  {EXERCISE_TYPES.map((ty) => (
                    <Chip
                      key={ty}
                      active={filters.type === ty}
                      onClick={() => toggle("type", ty)}
                    >
                      {t(`type.${ty}`)}
                    </Chip>
                  ))}
                </ChipRow>
                {activeCount > 0 && (
                  <div className="flex items-center justify-between px-5">
                    <span className="font-num text-xs tabular-nums text-bone-dim">
                      {t("results", { count: filtered.length })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(NO_FILTERS);
                        onMusclesChange([]);
                      }}
                      className="flex items-center gap-1 text-xs text-steel hover:underline"
                    >
                      <X className="h-3 w-3" />
                      {t("clear")}
                    </button>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto border-t border-panel-border px-5 py-3">
                {!exercises ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-bone">{t("noResults")}</p>
                    <p className="text-xs text-bone-dim">
                      {t("noResultsHint")}
                    </p>
                    {query.trim() && !exactMatch && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustom}
                        disabled={creating}
                      >
                        <Plus className="h-4 w-4" />
                        {creating
                          ? t("creating")
                          : t("createCustom", { query: query.trim() })}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filtered.map((ex) => (
                      <ExerciseRow
                        key={ex.id}
                        exercise={ex}
                        added={addedIds.has(ex.id)}
                        onOpen={() => setDetail(ex)}
                        onAdd={() => add(ex)}
                      />
                    ))}
                    {query.trim() && !exactMatch && (
                      <button
                        type="button"
                        onClick={addCustom}
                        disabled={creating}
                        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-panel-border py-3 text-sm text-steel hover:bg-carbon"
                      >
                        <Plus className="h-4 w-4" />
                        {creating
                          ? t("creating")
                          : t("createCustom", { query: query.trim() })}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-panel-border px-5 py-3">
                <Button className="w-full" onClick={() => setOpen(false)}>
                  {addedIds.size > 0
                    ? t("doneCount", { count: addedIds.size })
                    : t("done")}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ExerciseRow({
  exercise,
  added,
  onOpen,
  onAdd,
}: {
  exercise: Exercise;
  added: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const t = useTranslations("exerciseCatalog");
  const tm = useTranslations("muscleGroups");
  const tmus = useTranslations("muscles");
  const muscleLabel = (PRIMARY_MUSCLES as readonly string[]).includes(
    exercise.primary_muscle ?? "",
  )
    ? tmus(exercise.primary_muscle!)
    : (MUSCLE_GROUPS as readonly string[]).includes(exercise.muscle_group ?? "")
      ? tm(exercise.muscle_group!)
      : null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-panel-border bg-carbon/60 p-2.5 transition-colors hover:border-steel/40">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-panel-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gifSrc(exercise)}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-bone">
            {exercise.name}
          </span>
          <span className="truncate text-xs text-bone-dim">
            {[
              muscleLabel,
              exercise.equipment ? t(`equipment.${exercise.equipment}`) : null,
              exercise.user_id ? t("custom") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={added ? t("added") : t("add")}
        onClick={onAdd}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
          added
            ? "border-moss/40 bg-moss/15 text-moss"
            : "border-panel-border text-bone-dim hover:border-steel/60 hover:text-steel",
        )}
      >
        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
}

function DetailView({
  exercise,
  added,
  onBack,
  onAdd,
}: {
  exercise: Exercise;
  added: boolean;
  onBack: () => void;
  onAdd: () => void;
}) {
  const t = useTranslations("exerciseCatalog");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pb-3 pt-5">
        <button
          type="button"
          aria-label={t("done")}
          onClick={onBack}
          className="rounded-md p-1 text-bone-dim hover:text-bone"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <SheetTitle className="truncate">{exercise.name}</SheetTitle>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4">
        <ExerciseGif ex={exercise} />
        <ExerciseTags ex={exercise} />
        <ExerciseRecommendation ex={exercise} />
        <ExerciseDetails ex={exercise} />
      </div>
      <div className="border-t border-panel-border px-5 py-3">
        <Button className="w-full" onClick={onAdd} disabled={added}>
          {added ? (
            <>
              <Check className="h-4 w-4" /> {t("added")}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {t("add")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-5">
      {children}
    </div>
  );
}

function ChipDivider() {
  return <span className="h-5 w-px shrink-0 bg-panel-border" />;
}

function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? color
            ? ""
            : "border-steel bg-steel text-carbon"
          : "border-panel-border bg-carbon text-bone-dim hover:text-bone",
      )}
      style={
        active && color
          ? { borderColor: color, backgroundColor: `${color}26`, color }
          : undefined
      }
    >
      {children}
    </button>
  );
}
