"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      if (result.error) setError(result.error);
      else if (result.success) setSuccess(t("resetEmailSent"));
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-bone">{t("resetTitle")}</h1>
        <p className="text-sm text-bone-dim">{t("resetSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={t("emailPlaceholder")}
        />
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {success && <p className="text-sm text-moss">{success}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? tCommon("pleaseWait") : t("sendResetLink")}
      </Button>

      <p className="text-center text-sm text-bone-dim">
        <Link href="/login" className="text-steel underline underline-offset-2 hover:no-underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
