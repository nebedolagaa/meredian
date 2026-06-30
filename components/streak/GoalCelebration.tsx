"use client";

import { useEffect } from "react";
import { fireConfetti } from "@/lib/utils/confetti";
import { haptic } from "@/lib/utils/haptics";

/** ISO-week key like "2024-W31" used to celebrate the goal once per week. */
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${week}`;
}

/**
 * Fires a one-time confetti burst when the weekly goal is met. Guards against
 * repeating on every dashboard visit by recording the week in localStorage.
 */
export function GoalCelebration() {
  useEffect(() => {
    const storeKey = "meridian.goalCelebrated";
    const week = isoWeekKey();
    try {
      if (localStorage.getItem(storeKey) === week) return;
      localStorage.setItem(storeKey, week);
    } catch {
      return;
    }
    fireConfetti();
    haptic("celebrate");
  }, []);

  return null;
}
