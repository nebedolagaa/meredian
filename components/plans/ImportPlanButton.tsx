"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importSharedPlan } from "@/app/actions/plans";

/** "Save to my plans" on the public share page. */
export function ImportPlanButton({
  token,
  signedIn,
}: {
  token: string;
  signedIn: boolean;
}) {
  const t = useTranslations("sharePlan");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Button onClick={() => router.push("/login")}>
        <LogIn className="h-4 w-4" />
        {t("signInToSave")}
      </Button>
    );
  }

  async function onImport() {
    setError(null);
    setPending(true);
    const result = await importSharedPlan(token);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/plans");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onImport} disabled={pending}>
        <Download className="h-4 w-4" />
        {pending ? t("saving") : t("saveToMyPlans")}
      </Button>
      {error && <p className="text-center text-sm text-clay">{error}</p>}
    </div>
  );
}
