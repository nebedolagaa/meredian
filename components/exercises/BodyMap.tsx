"use client";

import Body, {
  type ExtendedBodyPart,
  type Slug,
} from "react-muscle-highlighter";
import { useTranslations } from "next-intl";
import {
  PRIMARY_MUSCLES,
  type PrimaryMuscle,
  type Sex,
} from "@/lib/types/database";

/**
 * Interactive anatomical body map built on top of `react-muscle-highlighter`
 * (MIT). Front + back detailed figures; each of our 11 muscle groups maps to
 * one or more library body parts and gets its own color from the site
 * palette when selected.
 */

/** Per-group accent colors (Tailwind 500 hues around the Meredian palette). */
export const MUSCLE_COLORS: Record<PrimaryMuscle, string> = {
  chest: "#6366F1", // indigo — brand steel
  back: "#8B5CF6", // violet
  shoulders: "#0EA5E9", // sky
  biceps: "#06B6D4", // cyan
  triceps: "#14B8A6", // teal
  forearms: "#10B981", // emerald
  abs: "#84CC16", // lime — brand moss
  glutes: "#F59E0B", // amber
  quads: "#F97316", // orange
  hamstrings: "#EF4444", // red — brand clay
  calves: "#F43F5E", // rose
};

/** Our muscle groups → library part slugs. */
const MUSCLE_TO_SLUGS: Record<PrimaryMuscle, Slug[]> = {
  chest: ["chest"],
  back: ["upper-back", "lower-back", "trapezius"],
  shoulders: ["deltoids"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
  abs: ["abs", "obliques"],
  glutes: ["gluteal"],
  quads: ["quadriceps", "adductors"],
  hamstrings: ["hamstring"],
  calves: ["calves", "tibialis"],
};

const SLUG_TO_MUSCLE: Partial<Record<Slug, PrimaryMuscle>> = {};
for (const muscle of PRIMARY_MUSCLES) {
  for (const slug of MUSCLE_TO_SLUGS[muscle]) {
    SLUG_TO_MUSCLE[slug] = muscle;
  }
}

/** Neutral fills that read on both light and dark themes. */
const IDLE_FILL = "rgba(148, 163, 184, 0.30)";
const OUTLINE = "rgba(148, 163, 184, 0.55)";

/** Blend a brand hex color to a translucent fill, scaled by 0-1 intensity. */
function intensityFill(hex: string, intensity: number): string {
  const clamped = Math.min(1, Math.max(0, intensity));
  const alpha = 0.2 + 0.8 * clamped;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function BodyMap({
  sex = "male",
  selected,
  onToggle,
  intensities,
}: {
  sex?: Sex;
  /** Selection mode: highlighted muscles with a flat color, tappable. */
  selected?: string[];
  onToggle?: (muscle: PrimaryMuscle) => void;
  /** Read-only heat-map mode: 0-1 intensity per muscle, overrides `selected`. */
  intensities?: Partial<Record<PrimaryMuscle, number>>;
}) {
  const t = useTranslations("exerciseCatalog");

  const data: ExtendedBodyPart[] = intensities
    ? (Object.entries(intensities) as [PrimaryMuscle, number | undefined][])
        .flatMap(([muscle, intensity]) => {
          const color = MUSCLE_COLORS[muscle];
          if (!color || !intensity || intensity <= 0) return [];
          return MUSCLE_TO_SLUGS[muscle].map((slug) => ({
            slug,
            styles: { fill: intensityFill(color, intensity) },
          }));
        })
    : (selected ?? []).flatMap((m) => {
        const muscle = m as PrimaryMuscle;
        const color = MUSCLE_COLORS[muscle];
        if (!color) return [];
        return MUSCLE_TO_SLUGS[muscle].map((slug) => ({
          slug,
          styles: { fill: color },
        }));
      });

  const handlePress = (part: ExtendedBodyPart) => {
    if (!onToggle) return;
    const muscle = part.slug ? SLUG_TO_MUSCLE[part.slug] : undefined;
    if (muscle) onToggle(muscle);
  };

  const gender = sex === "female" ? "female" : "male";

  return (
    <div className="flex items-start justify-center gap-6" data-body-map>
      {(["front", "back"] as const).map((side) => (
        <div key={side} className="flex flex-col items-center gap-1.5">
          <Body
            data={data}
            side={side}
            gender={gender}
            scale={0.68}
            border={OUTLINE}
            defaultFill={IDLE_FILL}
            onBodyPartPress={onToggle ? handlePress : undefined}
          />
          <span className="text-[11px] font-medium uppercase tracking-wide text-bone-dim">
            {t(side)}
          </span>
        </div>
      ))}
    </div>
  );
}
