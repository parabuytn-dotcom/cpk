"use client";

import { Capacitor } from "@capacitor/core";
import { registerPushToken } from "@/lib/push/actions";

/**
 * iOS Safari only exposes the Notification/Push API to a site that's been
 * added to the home screen and launched from there (standalone display mode)
 * — in a regular browser tab `window.Notification` doesn't exist at all, on
 * any iOS version. This isn't a bug to work around; the only fix is telling
 * the user how to add the site to their home screen.
 */
export function isIosSafariTab() {
  if (typeof navigator === "undefined") return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return isIOS && !isStandalone;
}

export async function registerNativeToken(): Promise<boolean> {
  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let regHandle: { remove: () => Promise<void> } | undefined;
    let errHandle: { remove: () => Promise<void> } | undefined;

    function finish(ok: boolean) {
      if (settled) return;
      settled = true;
      regHandle?.remove();
      errHandle?.remove();
      resolve(ok);
    }

    PushNotifications.addListener("registration", async (token) => {
      const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
      await registerPushToken(token.value, platform);
      finish(true);
    }).then((h) => (regHandle = h));

    PushNotifications.addListener("registrationError", () => finish(false)).then(
      (h) => (errHandle = h),
    );

    PushNotifications.register();
  });
}

export async function registerWebToken(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;

  const { isFirebaseWebConfigured, getFirebaseApp } = await import("@/lib/push/firebaseClient");
  if (!isFirebaseWebConfigured()) return false;

  const app = getFirebaseApp();
  if (!app) return false;

  const { getMessaging, getToken } = await import("firebase/messaging");
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) return false;
  const result = await registerPushToken(token, "web");
  return result.success;
}

/**
 * Firebase only routes a push through the service worker's
 * onBackgroundMessage when the tab is NOT focused. With the tab open and
 * active (the common case while testing), the message instead arrives here —
 * without this listener it's received by the SDK but never shown at all.
 */
export async function listenForegroundMessages() {
  const { isFirebaseWebConfigured, getFirebaseApp } = await import("@/lib/push/firebaseClient");
  if (!isFirebaseWebConfigured()) return;

  const app = getFirebaseApp();
  if (!app) return;

  const { getMessaging, onMessage } = await import("firebase/messaging");
  const messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const { title, body } = payload.notification ?? {};
    const link = payload.data?.link;
    const notification = new Notification(title ?? "CPK Learn", { body, icon: "/icon.png" });
    if (link) {
      notification.onclick = () => {
        window.focus();
        window.location.href = link;
      };
    }
  });
}
