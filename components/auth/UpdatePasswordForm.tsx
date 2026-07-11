"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/app/actions/auth";

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(t("passwordUpdated"));
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-bone">
          {t("newPasswordTitle")}
        </h1>
        <p className="text-sm text-bone-dim">{t("newPasswordSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {success && <p className="text-sm text-moss">{success}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? tCommon("pleaseWait") : t("updatePassword")}
      </Button>
    </form>
  );
}
