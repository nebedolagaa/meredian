"use client";

import {
  savePushSubscription,
  deletePushSubscription,
} from "@/app/actions/push";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Subscribe this browser to web push and store the subscription server-side.
 * Returns false when push isn't available: no service worker registration
 * (dev mode), no PushManager, missing VAPID key, or the user declined.
 */
export async function enablePush(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return false;
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    // getRegistration (not .ready) — .ready never resolves in dev where the
    // service worker is deliberately not registered.
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const result = await savePushSubscription({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    });
    return !result.error;
  } catch {
    return false;
  }
}

/** Unsubscribe this browser and forget the stored subscription. */
export async function disablePush(): Promise<void> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
  } catch {
    // Best-effort cleanup.
  }
}
