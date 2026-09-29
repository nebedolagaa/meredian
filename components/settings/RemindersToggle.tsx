"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { updateRemindersEnabled } from "@/app/actions/profile";
import { enablePush, disablePush } from "@/lib/push/client";

export function RemindersToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("reminders");
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [pushFailed, setPushFailed] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setPushFailed(false);
    setEnabled(next);
    startTransition(async () => {
      if (next) {
        if ("Notification" in window) {
          // Ask for permission the moment the user opts in.
          try {
            await Notification.requestPermission();
          } catch {
            // Ignore — enablePush() below still reports success/failure.
          }
        }
        // Background reminders via web push. Fails on browsers without
        // PushManager support (e.g. iOS Safari unless installed to the home
        // screen), a declined permission, or a missing VAPID key — in which
        // case don't claim the toggle is on.
        const subscribed = await enablePush();
        if (!subscribed) {
          setEnabled(false);
          setPushFailed(true);
          return;
        }
      } else {
        await disablePush();
      }
      await updateRemindersEnabled(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
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
      {pushFailed && (
        <p className="text-xs text-bone-dim">{t("pushFailed")}</p>
      )}
    </div>
  );
}
