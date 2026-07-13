"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Fires a single browser notification for today's pending session when the app
 * loads, provided the user enabled reminders and granted permission.
 *
 * Limitation: this only runs while the app is open. True background reminders
 * require push infrastructure (VAPID keys + a scheduled server).
 */
export function SessionReminder({
  enabled,
  planName,
}: {
  enabled: boolean;
  planName: string;
}) {
  const t = useTranslations("reminders");

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // Only notify once per day per device.
    const today = new Date().toISOString().slice(0, 10);
    const key = "meredian-reminder-shown";
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);

    try {
      new Notification(t("notificationTitle"), {
        body: t("notificationBody", { plan: planName }),
        icon: "/icon.svg",
      });
    } catch {
      // Notification construction can throw on some platforms — ignore.
    }
  }, [enabled, planName, t]);

  return null;
}
