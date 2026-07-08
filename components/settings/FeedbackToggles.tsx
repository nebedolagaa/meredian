"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { Vibrate, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getHapticsEnabled,
  setHapticsEnabled,
  getSoundEnabled,
  setSoundEnabled,
} from "@/lib/prefs/clientPrefs";
import { haptic } from "@/lib/utils/haptics";
import { playFeedbackSound } from "@/lib/utils/sound";

/** Client-side toggles for vibration and sound feedback (stored locally). */
export function FeedbackToggles() {
  const t = useTranslations("feedback");
  const [haptics, setHaptics] = useState(true);
  const [sound, setSound] = useState(true);

  // Preferences live in localStorage, so read them after mount.
  useEffect(() => {
    setHaptics(getHapticsEnabled());
    setSound(getSoundEnabled());
  }, []);

  function toggleHaptics() {
    const next = !haptics;
    setHaptics(next);
    setHapticsEnabled(next);
    if (next) haptic("success");
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) playFeedbackSound("success");
  }

  return (
    <div className="flex flex-col gap-4">
      <ToggleRow
        icon={Vibrate}
        label={t("haptics")}
        description={t("hapticsDesc")}
        enabled={haptics}
        onToggle={toggleHaptics}
      />
      <ToggleRow
        icon={Volume2}
        label={t("sound")}
        description={t("soundDesc")}
        enabled={sound}
        onToggle={toggleSound}
      />
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-bone-dim" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-bone">{label}</span>
          <span className="text-xs text-bone-dim">{description}</span>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={onToggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          enabled ? "bg-moss" : "bg-carbon border border-panel-border",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-bone transition-transform",
            enabled ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
