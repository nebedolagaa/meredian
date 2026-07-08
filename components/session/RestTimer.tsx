"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, Timer, X } from "lucide-react";
import { getHapticsEnabled } from "@/lib/prefs/clientPrefs";
import { playFeedbackSound } from "@/lib/utils/sound";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Show a browser notification when rest ends and the tab is backgrounded. */
function notifyRestDone(body: string) {
  if (typeof document === "undefined" || !document.hidden) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(body, { icon: "/icon.svg" });
  } catch {
    // ignore
  }
}

export interface RestTimerHandle {
  start: () => void;
}
/**
 * Floating rest countdown. Auto-starts when a set is completed and can be
 * adjusted or dismissed. A short vibration fires when it reaches zero.
 */
export function RestTimer({
  defaultSeconds,
  registerStart,
}: {
  defaultSeconds: number;
  registerStart?: (start: () => void) => void;
}) {
  const t = useTranslations("restTimer");
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setRemaining(0);
  }, []);

  const start = useCallback(() => {
    if (defaultSeconds <= 0) return;
    setTotal(defaultSeconds);
    setRemaining(defaultSeconds);
    setRunning(true);
  }, [defaultSeconds]);

  useEffect(() => {
    registerStart?.(start);
  }, [registerStart, start]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          if (
            getHapticsEnabled() &&
            typeof navigator !== "undefined" &&
            "vibrate" in navigator
          ) {
            navigator.vibrate?.([120, 60, 120]);
          }
          playFeedbackSound("restDone");
          notifyRestDone(t("done"));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  if (!running) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={defaultSeconds <= 0}
        className="inline-flex items-center gap-2 rounded-lg border border-panel-border px-3 py-2 text-xs text-bone-dim transition-colors hover:text-bone disabled:opacity-40"
      >
        <Timer className="h-4 w-4" />
        {t("startRest", { seconds: defaultSeconds })}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-32 z-40 flex justify-center px-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-panel-border bg-graphite/95 px-4 py-2.5 shadow-lg backdrop-blur">
        <div className="flex items-center gap-3">
          <Timer className="h-4 w-4 text-steel" />
          <button
            type="button"
            aria-label={t("subtract")}
            onClick={() => setRemaining((r) => Math.max(0, r - 15))}
            className="rounded-md p-1 text-bone-dim hover:text-bone"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-14 text-center font-num text-lg tabular-nums text-bone">
            {fmt(remaining)}
          </span>
          <button
            type="button"
            aria-label={t("add")}
            onClick={() => setRemaining((r) => r + 15)}
            className="rounded-md p-1 text-bone-dim hover:text-bone"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("dismiss")}
            onClick={stop}
            className="rounded-md p-1 text-clay hover:bg-clay/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-panel-border">
          <div
            className="h-full rounded-full bg-steel transition-[width] duration-1000 ease-linear"
            style={{
              width: `${total > 0 ? Math.min(100, (remaining / total) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
