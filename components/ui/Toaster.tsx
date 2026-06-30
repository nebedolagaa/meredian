"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import {
  subscribeToasts,
  getToasts,
  dismissToast,
  type ToastItem,
} from "@/lib/toast/store";

const EMPTY: ToastItem[] = [];

/**
 * Renders the active toast stack. Mount once near the app root. Toasts are
 * pushed imperatively via `toast()` from `@/lib/toast/store`.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => EMPTY);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-panel-border bg-graphite/95 px-4 py-3 shadow-lg backdrop-blur"
        >
          <span className="flex-1 text-sm text-bone">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick();
                dismissToast(t.id);
              }}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-steel transition-colors hover:bg-steel/10"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-bone-dim transition-colors hover:text-bone"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
