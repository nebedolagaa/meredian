/** Date helpers — all in local time, mobile-first. ISO strings (YYYY-MM-DD). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Monday-based start of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Array of 7 Date objects Mon..Sun for the week containing `d`. */
export function weekDays(d: Date = new Date()): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 6-week grid (42 cells) of dates for a month view, Monday-first. */
export function monthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function shortDate(iso: string): string {
  const [, m, day] = iso.split("-");
  return `${day}.${m}`;
}
