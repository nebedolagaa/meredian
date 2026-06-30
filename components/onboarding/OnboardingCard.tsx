"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createStarterPlan } from "@/app/actions/onboarding";

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
      <CardContent className="flex flex-col gap-3 py-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-moss" />
          <h3 className="text-sm font-medium text-bone">{t("title")}</h3>
        </div>
        <p className="text-xs text-bone-dim">{t("description")}</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button onClick={create} disabled={pending} className="mt-1 self-start">
          {pending ? t("creating") : t("cta")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
