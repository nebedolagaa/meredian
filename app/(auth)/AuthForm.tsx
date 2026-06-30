"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn, signUp, type AuthResult } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const action = mode === "login" ? signIn : signUp;
      const result: AuthResult | undefined = await action(formData);
      // A redirect throws, so reaching here means a result was returned.
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.success === "confirmEmail") {
        setConfirmEmail(String(formData.get("email") ?? ""));
      }
    });
  }

  if (confirmEmail) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-moss/10">
          <MailCheck className="h-6 w-6 text-moss" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-medium text-bone">
            {t("confirmEmailTitle")}
          </h2>
          <p className="text-sm text-bone-dim">
            {t("confirmEmailBody", { email: confirmEmail })}
          </p>
        </div>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link href="/login">{t("goToSignIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      {mode === "signup" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">{t("displayName")}</Label>
          <Input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            placeholder={t("displayNamePlaceholder")}
          />
        </div>
      )}

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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          placeholder="••••••••"
        />
      </div>

      {mode === "login" && (
        <div className="-mt-1 flex items-center justify-between">
          <label
            htmlFor="remember"
            className="flex cursor-pointer select-none items-center gap-2 text-xs text-bone-dim"
          >
            <Checkbox
              id="remember"
              name="remember"
              defaultChecked
              className="h-5 w-5"
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/reset-password"
            className="text-xs text-bone-dim hover:text-bone"
          >
            {t("forgotPassword")}
          </Link>
        </div>
      )}

      {error && <p className="text-sm text-clay">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending
          ? tCommon("pleaseWait")
          : mode === "login"
            ? t("signIn")
            : t("createAccount")}
      </Button>

      <p className="text-center text-sm text-bone-dim">
        {mode === "login" ? (
          <>
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-steel hover:underline">
              {t("signUp")}
            </Link>
          </>
        ) : (
          <>
            {t("haveAccount")}{" "}
            <Link href="/login" className="text-steel hover:underline">
              {t("signIn")}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
