"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useTranslations } from "next-intl";

export function ShareRecordButton({
  name,
  weight,
  reps,
  oneRepMax,
  unit,
}: {
  name: string;
  weight: number;
  reps: number;
  oneRepMax: number;
  unit: string;
}) {
  const t = useTranslations("analytics");
  const [done, setDone] = useState(false);

  const text = t("shareText", {
    name,
    weight,
    unit,
    reps,
    oneRepMax,
  });

  function copyFallback() {
    // Modern clipboard API needs a secure context; fall back to execCommand.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(flagCopied).catch(legacyCopy);
    } else {
      legacyCopy();
    }
  }

  function legacyCopy() {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      flagCopied();
    } catch {
      // nothing else we can do — ignore
    }
  }

  function flagCopied() {
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  async function onShare() {
    const shareData = { title: t("records"), text };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User dismissed the native share sheet — don't fall back.
        if (err instanceof Error && err.name === "AbortError") return;
        // Any other failure (unsupported payload, permission) → copy instead.
      }
    }
    copyFallback();
  }

  return (
    <button
      type="button"
      aria-label={t("share")}
      title={t("share")}
      onClick={onShare}
      className="rounded-md p-1.5 text-bone-dim transition-colors hover:text-bone"
    >
      {done ? (
        <Check className="h-4 w-4 text-moss" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </button>
  );
}
