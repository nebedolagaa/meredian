"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export interface ChartColors {
  /** Primary accent (indigo). */
  steel: string;
  /** Success (lime). */
  moss: string;
  /** Negative (red). */
  clay: string;
  /** Muted text / axis color. */
  boneDim: string;
  /** Cartesian grid line color. */
  grid: string;
  /** Tooltip/bar hover cursor fill. */
  cursor: string;
  /** Card surface, used for dot strokes so points read against the panel. */
  surface: string;
}

const DARK: ChartColors = {
  steel: "#818CF8",
  moss: "#A3E635",
  clay: "#F87171",
  boneDim: "rgba(236,236,242,0.55)",
  grid: "rgba(255,255,255,0.06)",
  cursor: "rgba(255,255,255,0.05)",
  surface: "#181A21",
};

const LIGHT: ChartColors = {
  steel: "#4F46E5",
  moss: "#4D7C0F",
  clay: "#DC2626",
  boneDim: "rgba(20,21,26,0.65)",
  grid: "rgba(15,16,21,0.12)",
  cursor: "rgba(15,16,21,0.06)",
  surface: "#FFFFFF",
};

/**
 * Theme-aware palette for Recharts surfaces. Recharts needs concrete color
 * strings (not CSS classes), so charts can't rely on Tailwind tokens for SVG
 * strokes/fills — this hook supplies the right values per theme.
 */
export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  return theme === "light" ? LIGHT : DARK;
}
