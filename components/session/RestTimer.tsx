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

interface StoredTimer {
  endAt: number;
  total: number;
}

function loadStored(storageKey: string): StoredTimer | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTimer;
    if (
      typeof parsed?.endAt !== "number" ||
      typeof parsed?.total !== "number" ||
      parsed.endAt <= Date.now()
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface RestTimerHandle {
  start: () => void;
}
/**
 * Floating rest countdown. Auto-starts when a set is completed and can be
 * adjusted or dismissed. A short vibration fires when it reaches zero.
 *
 * Deadline-based rather than tick-decrement: background tabs throttle
 * `setInterval`, so the remaining time is always recomputed from a wall-clock
 * deadline. The deadline is persisted under a per-exercise `storageKey`, so a
 * running timer survives reloads and card collapse/expand remounts without
 * ever attaching to the wrong exercise.
 */
export function RestTimer({
  defaultSeconds,
  registerStart,
  storageKey,
  hideIdle = false,
}: {
  defaultSeconds: number;
  registerStart?: (start: () => void) => void;
  /** localStorage key owning this timer (unique per exercise / superset). */
  storageKey: string;
  /** Render nothing while idle (used in collapsed exercise cards). */
  hideIdle?: boolean;
}) {
  const t = useTranslations("restTimer");
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const firedRef = useRef(false);

  const persist = useCallback(
    (next: StoredTimer | null) => {
      try {
        if (next) localStorage.setItem(storageKey, JSON.stringify(next));
        else localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const stop = useCallback(() => {
    setEndAt(null);
    setRemaining(0);
    persist(null);
  }, [persist]);

  const start = useCallback(() => {
    if (defaultSeconds <= 0) return;
    const deadline = Date.now() + defaultSeconds * 1000;
    firedRef.current = false;
    setTotal(defaultSeconds);
    setEndAt(deadline);
    setRemaining(defaultSeconds);
    persist({ endAt: deadline, total: defaultSeconds });
  }, [defaultSeconds, persist]);

  // Pure state setters only — the next values are computed up front so the
  // updaters stay side-effect free (StrictMode runs them twice).
  const adjust = useCallback(
    (deltaSeconds: number) => {
      if (endAt == null) return;
      const nextEnd = Math.max(Date.now(), endAt + deltaSeconds * 1000);
      const nextTotal = Math.max(1, total + deltaSeconds);
      setEndAt(nextEnd);
      setTotal(nextTotal);
      persist({ endAt: nextEnd, total: nextTotal });
    },
    [endAt, total, persist],
  );

  useEffect(() => {
    registerStart?.(start);
  }, [registerStart, start]);

  // Resume this exercise's timer after a reload or a collapse/expand remount.
  // localStorage is client-only, so this runs post-hydration (deferred a tick
  // to keep the effect body free of synchronous state updates).
  useEffect(() => {
    const stored = loadStored(storageKey);
    if (!stored) return;
    const id = window.setTimeout(() => {
      firedRef.current = false;
      setEndAt(stored.endAt);
      setTotal(stored.total);
      setRemaining(Math.ceil((stored.endAt - Date.now()) / 1000));
    }, 0);
    return () => clearTimeout(id);
  }, [storageKey]);

  // Tick: recompute remaining from the deadline (robust to throttling), and
  // recompute immediately when the tab becomes visible again.
  useEffect(() => {
    if (endAt == null) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        if (
          getHapticsEnabled() &&
          typeof navigator !== "undefined" &&
          "vibrate" in navigator
        ) {
          navigator.vibrate?.([120, 60, 120]);
        }
        playFeedbackSound("restDone");
        notifyRestDone(t("done"));
        setEndAt(null);
        persist(null);
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [endAt, persist, t]);

  if (endAt == null) {
    if (hideIdle) return null;
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
            onClick={() => adjust(-15)}
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
            onClick={() => adjust(15)}
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
            className="h-full rounded-full bg-steel transition-[width] duration-500 ease-linear"
            style={{
              width: `${total > 0 ? Math.min(100, (remaining / total) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
