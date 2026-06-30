"use client";

import { getHapticsEnabled } from "@/lib/prefs/clientPrefs";

export type HapticPattern = "tap" | "success" | "celebrate" | "warn";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 15,
  success: [20, 40, 30],
  celebrate: [30, 50, 30, 50, 70],
  warn: [60, 40, 60],
};

/**
 * Fire a short vibration using the Vibration API. No-ops when the device has no
 * vibration support or the user disabled haptics in settings.
 */
export function haptic(pattern: HapticPattern = "tap") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (!getHapticsEnabled()) return;
  try {
    navigator.vibrate?.(PATTERNS[pattern]);
  } catch {
    // Vibration not available — silently ignore.
  }
}
