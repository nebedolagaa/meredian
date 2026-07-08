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

/** Per-group accent colors (Tailwind 500 hues around the Meridian palette). */
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

export function BodyMap({
  sex = "male",
  selected,
  onToggle,
}: {
  sex?: Sex;
  selected: string[];
  onToggle: (muscle: PrimaryMuscle) => void;
}) {
  const t = useTranslations("exerciseCatalog");

  const data: ExtendedBodyPart[] = selected.flatMap((m) => {
    const muscle = m as PrimaryMuscle;
    const color = MUSCLE_COLORS[muscle];
    if (!color) return [];
    return MUSCLE_TO_SLUGS[muscle].map((slug) => ({
      slug,
      styles: { fill: color },
    }));
  });

  const handlePress = (part: ExtendedBodyPart) => {
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
            onBodyPartPress={handlePress}
          />
          <span className="text-[11px] font-medium uppercase tracking-wide text-bone-dim">
            {t(side)}
          </span>
        </div>
      ))}
    </div>
  );
}
