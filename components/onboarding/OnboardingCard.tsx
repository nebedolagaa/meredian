"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  ArrowRight,
  ClipboardList,
  CalendarClock,
  Dumbbell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createStarterPlan } from "@/app/actions/onboarding";

const steps = [
  { icon: ClipboardList, key: "stepPlan" },
  { icon: CalendarClock, key: "stepSchedule" },
  { icon: Dumbbell, key: "stepLog" },
] as const;

export function OnboardingCard() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createStarterPlan();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      if (result.id) router.push(`/plans/${result.id}`);
    });
  }

  return (
    <Card className="border-moss/40">
      <CardContent className="flex flex-col gap-4 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-moss" />
          <h3 className="text-sm font-medium text-bone">{t("title")}</h3>
        </div>
        <p className="text-xs text-bone-dim">{t("description")}</p>

        {/* Roadmap preview: what happens after the tap. */}
        <ol className="flex flex-col gap-2.5">
          {steps.map(({ icon: Icon, key }, i) => (
            <li key={key} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs text-bone">
                <span className="mr-1.5 font-num tabular-nums text-bone-dim">
                  {i + 1}.
                </span>
                {t(key)}
              </span>
            </li>
          ))}
        </ol>

        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button onClick={create} disabled={pending} className="mt-1 self-start">
          {pending ? t("creating") : t("cta")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
