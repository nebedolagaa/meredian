"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

/**
 * Compact icon button that toggles between light and dark themes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("theme");
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      title={isDark ? t("switchToLight") : t("switchToDark")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-panel-border text-bone-dim transition-colors hover:text-bone",
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/**
 * Segmented Light / Dark control for settings-style surfaces.
 */
export function ThemeSegmented({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");

  const options: {
    value: "light" | "dark";
    label: string;
    icon: typeof Sun;
  }[] = [
    { value: "dark", label: t("dark"), icon: Moon },
    { value: "light", label: t("light"), icon: Sun },
  ];

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-panel-border bg-carbon p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-steel text-carbon" : "text-bone-dim hover:text-bone",
            )}
          >
            <opt.icon className="h-4 w-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
