"use client";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
  duration: number;
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  for (const listener of Array.from(listeners)) listener();
}

export function subscribeToasts(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getToasts() {
  return items;
}

/**
 * Show a transient toast. Returns its id. Provide `action` for an inline
 * button (e.g. Undo). A `duration` of 0 keeps the toast until dismissed.
 */
export function toast(
  message: string,
  opts?: { action?: ToastAction; duration?: number },
): number {
  const id = nextId++;
  const duration = opts?.duration ?? 5000;
  items = [...items, { id, message, action: opts?.action, duration }];
  emit();
  if (duration > 0) {
    window.setTimeout(() => dismissToast(id), duration);
  }
  return id;
}

export function dismissToast(id: number) {
  const next = items.filter((t) => t.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}
