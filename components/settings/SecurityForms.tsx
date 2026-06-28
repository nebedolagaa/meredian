"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmail, updatePassword } from "@/app/actions/auth";

export function SecurityForms({ currentEmail }: { currentEmail: string }) {
  const t = useTranslations("security");
  const tCommon = useTranslations("common");
  const [emailMsg, setEmailMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [emailPending, startEmail] = useTransition();
  const [pwPending, startPw] = useTransition();

  function onEmail(formData: FormData) {
    setEmailMsg(null);
    startEmail(async () => {
      const result = await updateEmail(formData);
      if (result.error) setEmailMsg({ ok: false, text: result.error });
      else setEmailMsg({ ok: true, text: t("emailConfirmSent") });
    });
  }

  function onPassword(formData: FormData) {
    setPwMsg(null);
    startPw(async () => {
      const result = await updatePassword(formData);
      if (result.error) setPwMsg({ ok: false, text: result.error });
      else setPwMsg({ ok: true, text: t("passwordChanged") });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={onEmail} className="flex flex-col gap-2">
        <Label htmlFor="new-email">{t("changeEmail")}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="new-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={currentEmail}
            className="font-num"
          />
          <Button
            type="submit"
            disabled={emailPending}
            variant="outline"
            size="sm"
          >
            {emailPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
        {emailMsg && (
          <p
            className={emailMsg.ok ? "text-xs text-moss" : "text-xs text-clay"}
          >
            {emailMsg.text}
          </p>
        )}
      </form>

      <form action={onPassword} className="flex flex-col gap-2">
        <Label htmlFor="settings-password">{t("changePassword")}</Label>
        <div className="flex items-center gap-2">
          <Input
            id="settings-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
          <Button
            type="submit"
            disabled={pwPending}
            variant="outline"
            size="sm"
          >
            {pwPending ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
        {pwMsg && (
          <p className={pwMsg.ok ? "text-xs text-moss" : "text-xs text-clay"}>
            {pwMsg.text}
          </p>
        )}
      </form>
    </div>
  );
}
