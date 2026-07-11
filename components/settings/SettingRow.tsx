"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Titled group of setting rows on the profile page. */
export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-bone-dim">
        {title}
      </h2>
      <div className="divide-y divide-panel-border overflow-hidden rounded-2xl border border-panel-border bg-graphite">
        {children}
      </div>
    </section>
  );
}

/**
 * A tappable row that opens its children inside a centered modal dialog.
 * Used to keep the profile page compact — each editor lives in a modal.
 */
export function SettingRow({
  icon,
  title,
  value,
  dialogTitle,
  dialogDescription,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** Current value preview shown on the right side of the row. */
  value?: string | null;
  dialogTitle?: string;
  dialogDescription?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-carbon/60"
        >
          <span className="shrink-0 text-steel">{icon}</span>
          <span className="flex-1 truncate text-sm text-bone">{title}</span>
          {value && (
            <span className="max-w-[40%] truncate text-xs text-bone-dim">
              {value}
            </span>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-bone-dim" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-panel-border bg-graphite p-5 shadow-xl",
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="font-display text-lg font-semibold text-bone">
                {dialogTitle ?? title}
              </DialogPrimitive.Title>
              {dialogDescription && (
                <DialogPrimitive.Description className="text-xs text-bone-dim">
                  {dialogDescription}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-bone-dim transition-colors hover:text-bone"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
