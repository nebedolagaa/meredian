"use client";

import { createContext, useContext } from "react";
import type { WeightUnit } from "@/lib/types/database";
import type { RecommendationProfile } from "@/lib/utils/recommendations";

export interface ExerciseProfile extends RecommendationProfile {
  unit: WeightUnit;
}

const ExerciseProfileContext = createContext<ExerciseProfile | null>(null);

/**
 * Makes the signed-in user's body profile (weight, height, sex, training
 * level, unit) available to any exercise preview so it can render
 * personalised weight / difficulty recommendations without prop drilling.
 * Mounted once in the (app) layout.
 */
export function ExerciseProfileProvider({
  profile,
  children,
}: {
  profile: ExerciseProfile;
  children: React.ReactNode;
}) {
  return (
    <ExerciseProfileContext.Provider value={profile}>
      {children}
    </ExerciseProfileContext.Provider>
  );
}

export function useExerciseProfile(): ExerciseProfile | null {
  return useContext(ExerciseProfileContext);
}
