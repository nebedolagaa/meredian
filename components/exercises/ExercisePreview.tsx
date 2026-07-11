"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Play, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  EXERCISE_PLACEHOLDER_GIF,
  MUSCLE_GROUPS,
  EXERCISE_TYPES,
  EQUIPMENT_VALUES,
  EXERCISE_LOCATIONS,
  PRIMARY_MUSCLES,
} from "@/lib/types/database";
import {
  EXERCISE_INFO_SLUGS,
  exerciseSlug,
  recommendExercise,
} from "@/lib/utils/recommendations";
import { toDisplayWeight, unitLabel } from "@/lib/utils/units";
import { useExerciseProfile } from "@/components/exercises/ExerciseProfileProvider";

/** Minimal shape needed to preview an exercise anywhere in the app. */
export interface ExerciseMeta {
  name: string;
  description?: string | null;
  muscle_group?: string | null;
  exercise_type?: string | null;
  equipment?: string | null;
  location?: string | null;
  gif_url?: string | null;
  primary_muscle?: string | null;
}

export function gifSrc(ex: Pick<ExerciseMeta, "gif_url">) {
  return ex.gif_url || EXERCISE_PLACEHOLDER_GIF;
}

const includes = (list: readonly string[], v: string | null | undefined) =>
  !!v && list.includes(v);

/** Translated category badges for an exercise. Unknown values are skipped. */
export function ExerciseTags({ ex }: { ex: ExerciseMeta }) {
  const t = useTranslations("exerciseCatalog");
  const tm = useTranslations("muscleGroups");
  const tmus = useTranslations("muscles");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {includes(MUSCLE_GROUPS, ex.muscle_group) && (
        <Badge variant="steel">{tm(ex.muscle_group!)}</Badge>
      )}
      {includes(PRIMARY_MUSCLES, ex.primary_muscle) &&
        ex.primary_muscle !== ex.muscle_group && (
          <Badge variant="steel">{tmus(ex.primary_muscle!)}</Badge>
        )}
      {includes(EQUIPMENT_VALUES, ex.equipment) && (
        <Badge variant="outline">{t(`equipment.${ex.equipment}`)}</Badge>
      )}
      {includes(EXERCISE_TYPES, ex.exercise_type) && (
        <Badge variant="outline">{t(`type.${ex.exercise_type}`)}</Badge>
      )}
      {includes(EXERCISE_LOCATIONS, ex.location) && (
        <Badge variant="outline">{t(`location.${ex.location}`)}</Badge>
      )}
    </div>
  );
}

/**
 * Localised description + step-by-step technique instructions for the seed
 * catalog; falls back to the free-text DB description for custom exercises.
 */
export function ExerciseDetails({ ex }: { ex: ExerciseMeta }) {
  const t = useTranslations("exerciseCatalog");
  const ti = useTranslations("exerciseInfo");
  const slug = exerciseSlug(ex.name);

  if (!EXERCISE_INFO_SLUGS.has(slug)) {
    return ex.description ? (
      <p className="text-sm leading-relaxed text-bone-dim">{ex.description}</p>
    ) : null;
  }

  const steps = ti(`${slug}.steps`)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-bone-dim">
        {ti(`${slug}.desc`)}
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-bone">
          {t("howTo")}
        </h3>
        <ol className="flex flex-col gap-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="font-num shrink-0 tabular-nums text-steel">
                {i + 1}.
              </span>
              <span className="text-bone-dim">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * Personalised starting weight / difficulty card. Uses the profile from
 * ExerciseProfileProvider (body weight, height, sex, training level).
 * Renders nothing when there is no profile or no sensible recommendation.
 */
export function ExerciseRecommendation({ ex }: { ex: ExerciseMeta }) {
  const t = useTranslations("exerciseCatalog");
  const tl = useTranslations("onboardingWizard.level");
  const profile = useExerciseProfile();
  if (!profile) return null;

  const rec = recommendExercise(ex, profile);
  if (!rec) return null;

  const level = profile.trainingLevel ?? "beginner";

  const mainLine =
    rec.kind === "weight"
      ? `${toDisplayWeight(rec.weightKg, profile.unit)} ${unitLabel(profile.unit)}`
      : rec.kind === "time"
        ? t("recommendation.timeScheme", {
            sets: rec.sets,
            seconds: rec.seconds,
          })
        : t("recommendation.scheme", { sets: rec.sets, reps: rec.reps });

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-panel-border bg-carbon p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel">
          <Sparkles className="h-3.5 w-3.5" />
          {t("recommendation.title")}
        </div>
        <Badge variant="outline">{tl(level)}</Badge>
      </div>
      <p className="font-num text-lg font-semibold tabular-nums text-bone">
        {mainLine}
        {rec.kind === "weight" && (
          <span className="ml-2 text-sm font-normal text-bone-dim">
            {t("recommendation.scheme", { sets: rec.sets, reps: rec.reps })}
          </span>
        )}
      </p>
      <p className="text-xs leading-relaxed text-bone-dim">
        {t(`recommendation.guidance.${level}`)}
      </p>
    </div>
  );
}

/** Animated technique demo image with consistent framing. */
export function ExerciseGif({
  ex,
  className,
}: {
  ex: ExerciseMeta;
  className?: string;
}) {
  const t = useTranslations("exerciseCatalog");
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-panel-border bg-white",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gifSrc(ex)}
        alt={t("previewAlt", { name: ex.name })}
        loading="lazy"
        className="mx-auto aspect-square w-full max-w-[300px] object-contain"
      />
    </div>
  );
}

/** Bottom sheet with the full technique preview for an exercise. */
export function ExercisePreviewSheet({
  exercise,
  open,
  onOpenChange,
  footer,
}: {
  exercise: ExerciseMeta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto"
      >
        {exercise && (
          <>
            <SheetHeader>
              <SheetTitle>{exercise.name}</SheetTitle>
            </SheetHeader>
            <ExerciseGif ex={exercise} />
            <ExerciseTags ex={exercise} />
            <ExerciseRecommendation ex={exercise} />
            <ExerciseDetails ex={exercise} />
            {footer}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Small GIF thumbnail that opens the technique preview when tapped.
 * Used in plan builder rows so the demo is always one tap away.
 */
export function ExerciseThumb({
  ex,
  className,
}: {
  ex: ExerciseMeta;
  className?: string;
}) {
  const t = useTranslations("exerciseCatalog");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={t("previewAlt", { name: ex.name })}
        onClick={() => setOpen(true)}
        className={cn(
          "group relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-panel-border bg-white",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={gifSrc(ex)}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-carbon/30 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-4 w-4 text-white drop-shadow" />
        </span>
      </button>
      <ExercisePreviewSheet
        exercise={open ? ex : null}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
