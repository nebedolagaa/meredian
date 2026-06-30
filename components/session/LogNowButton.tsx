"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logWorkoutNow } from "@/app/actions/sessions";

/**
 * One-tap "log a workout now" — creates and starts an unplanned session for
 * today from the given plan, then opens the runner.
 */
export function LogNowButton({
  planId,
  className,
}: {
  planId: string;
  className?: string;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await logWorkoutNow(planId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.id) {
        router.push(`/session/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <Button className={className} disabled={pending} onClick={run}>
        <Play className="h-4 w-4" />
        {pending ? t("logNowPending") : t("logNow")}
      </Button>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
