"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { updateRemindersEnabled } from "@/app/actions/profile";

export function RemindersToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("reminders");
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      if (next && "Notification" in window) {
        // Ask for permission the moment the user opts in.
        try {
          await Notification.requestPermission();
        } catch {
          // Ignore — the toggle still records the preference.
        }
      }
      await updateRemindersEnabled(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-bone">{t("enable")}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
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
