"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Route-aware coach-mark tour shown once after registration.
 *
 * State lives in localStorage under TOUR_KEY: a step index ("0".."n") while
 * active, "done" when finished/skipped, absent for users who never started
 * it. The onboarding wizard seeds "0" when the user finishes sign-up setup.
 *
 * The tour is non-blocking: the page stays interactive so the user can
 * actually perform each step (create the plan, schedule it, start it).
 */

export const TOUR_KEY = "meredian.tour";

export function startGuidedTour() {
  try {
    if (localStorage.getItem(TOUR_KEY) !== "done") {
      localStorage.setItem(TOUR_KEY, "0");
    }
  } catch {
    /* storage unavailable — skip the tour */
  }
}

type TourStep = {
  id: string;
  /** Exact pathname the step belongs to. */
  route: string;
  /** Value of the data-tour attribute to anchor the tooltip to. */
  target: string;
};

const STEPS: TourStep[] = [
  { id: "welcome", route: "/dashboard", target: "nav-plans" },
  { id: "newPlan", route: "/plans", target: "new-plan" },
  { id: "builder", route: "/plans/new", target: "plan-name" },
  { id: "schedule", route: "/calendar", target: "calendar-add" },
  { id: "start", route: "/dashboard", target: "today-card" },
];

const PADDING = 6;

export function GuidedTour() {
  const t = useTranslations("tour");
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Load state on mount (client only, avoids hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOUR_KEY);
      if (raw === null || raw === "done") return;
      const i = Number(raw);
      if (Number.isInteger(i) && i >= 0 && i < STEPS.length) setIndex(i);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((value: number | "done") => {
    try {
      localStorage.setItem(TOUR_KEY, String(value));
    } catch {
      /* ignore */
    }
    setIndex(value === "done" ? null : value);
  }, []);

  const finish = useCallback(() => persist("done"), [persist]);

  const goTo = useCallback(
    (i: number) => {
      if (i >= STEPS.length) {
        finish();
        return;
      }
      persist(i);
      if (STEPS[i].route !== pathname) router.push(STEPS[i].route);
    },
    [finish, persist, pathname, router],
  );

  // If the user navigates ahead on their own (e.g. taps the highlighted
  // button instead of "Next"), fast-forward to the first later step that
  // matches the new route.
  useEffect(() => {
    if (index === null) return;
    if (STEPS[index].route === pathname) return;
    const ahead = STEPS.findIndex((s, i) => i > index && s.route === pathname);
    if (ahead !== -1) persist(ahead);
  }, [pathname, index, persist]);

  const step = index !== null ? STEPS[index] : null;
  const onRoute = step !== null && step.route === pathname;

  // Track the anchor element's rect while the step is visible. Poll so we
  // pick up late-mounting elements and layout shifts without observers.
  useEffect(() => {
    if (!step || !onRoute) {
      setRect(null);
      return;
    }
    let raf = 0;
    const update = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${step.target}"]`,
      );
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    const interval = setInterval(() => {
      raf = requestAnimationFrame(update);
    }, 250);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, onRoute]);

  if (index === null || step === null) return null;

  const isLast = index === STEPS.length - 1;

  // The user wandered off the step's route (e.g. saved the plan and landed
  // back on /plans): show a small pill that resumes the tour at the next
  // step instead of a full tooltip.
  if (!onRoute) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4">
        <div className="flex items-center gap-1 rounded-full border border-panel-border bg-graphite py-1 pl-4 pr-1 shadow-lg">
          <span className="font-num text-xs tabular-nums text-bone-dim">
            {t("stepOf", { current: index + 1, total: STEPS.length })}
          </span>
          <Button size="sm" variant="ghost" onClick={() => goTo(index + 1)}>
            {isLast ? t("finish") : t("continue")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            type="button"
            onClick={finish}
            aria-label={t("skipTour")}
            className="rounded-full p-2 text-bone-dim transition-colors hover:text-bone"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const placeAbove = rect !== null && rect.top > window.innerHeight / 2;

  return (
    <>
      {/* Spotlight around the anchor; clicks pass through so the user can
          interact with the highlighted element. */}
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[55] rounded-xl border-2 border-steel shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        role="dialog"
        aria-label={t(`steps.${step.id}.title`)}
        className="fixed inset-x-0 z-[60] flex justify-center px-4 transition-all duration-200"
        style={
          rect
            ? placeAbove
              ? { bottom: window.innerHeight - rect.top + PADDING + 12 }
              : { top: rect.bottom + PADDING + 12 }
            : { top: "40%" }
        }
      >
        <div className="relative w-full max-w-sm rounded-2xl border border-panel-border bg-graphite p-4 shadow-xl">
          {/* Arrow */}
          {rect && (
            <div
              aria-hidden
              className={cn(
                "absolute h-3 w-3 rotate-45 border-panel-border bg-graphite",
                placeAbove
                  ? "-bottom-[7px] border-b border-r"
                  : "-top-[7px] border-l border-t",
              )}
              style={{
                left: Math.min(
                  Math.max(rect.left + rect.width / 2 - 22, 16),
                  336,
                ),
              }}
            />
          )}

          <div className="mb-1 flex items-start justify-between gap-3">
            <span className="font-num text-[11px] tabular-nums text-bone-dim">
              {t("stepOf", { current: index + 1, total: STEPS.length })}
            </span>
            <button
              type="button"
              onClick={finish}
              className="-m-1 rounded-md p-1 text-xs text-bone-dim transition-colors hover:text-bone"
            >
              {t("skipTour")}
            </button>
          </div>

          <h3 className="font-display text-sm font-semibold text-bone">
            {t(`steps.${step.id}.title`)}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-bone-dim">
            {t(`steps.${step.id}.body`)}
          </p>

          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={() => goTo(index + 1)}>
              {isLast ? (
                <>
                  {t("finish")} <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  {t("next")} <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
