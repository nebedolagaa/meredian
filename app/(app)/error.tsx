"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-8 w-8 text-clay" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-bone">{t("title")}</p>
        <p className="text-xs text-bone-dim">{t("description")}</p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        {t("retry")}
      </Button>
    </div>
  );
}
