"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "meredian-install-dismissed";

/**
 * Shows an "Add to home screen" banner on Android/desktop Chromium where the
 * beforeinstallprompt event is available. iOS Safari has no such API, so the
 * banner only renders where the install can actually be triggered.
 */
export function InstallBanner() {
  const t = useTranslations("install");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-full max-w-sm px-4 md:max-w-2xl">
      <div className="flex items-center gap-3 rounded-2xl border border-panel-border bg-graphite p-3 shadow-lg">
        <Download className="h-5 w-5 shrink-0 text-steel" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-bone">{t("title")}</p>
          <p className="text-xs text-bone-dim">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="rounded-lg bg-steel px-3 py-1.5 text-xs font-medium text-carbon"
        >
          {t("action")}
        </button>
        <button
          type="button"
          aria-label={t("dismiss")}
          onClick={dismiss}
          className="rounded-lg p-1 text-bone-dim hover:text-bone"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
