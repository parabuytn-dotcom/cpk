"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslations } from "next-intl";
import { registerPushToken } from "@/lib/push/actions";

type Status = "checking" | "idle" | "unsupported" | "denied" | "registering" | "granted" | "error";

async function registerNative(): Promise<boolean> {
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
      await registerPushToken(token.value, "android");
      finish(true);
    }).then((h) => (regHandle = h));

    PushNotifications.addListener("registrationError", () => finish(false)).then(
      (h) => (errHandle = h),
    );

    PushNotifications.register();
  });
}

async function registerWeb() {
  if (typeof Notification === "undefined") return false;

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

export default function PushNotificationToggle() {
  const t = useTranslations("notificationsUi");
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (Capacitor.isNativePlatform()) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.checkPermissions();
        if (cancelled) return;
        if (perm.receive === "granted") {
          // Already granted in a previous session — silently keep the
          // token fresh rather than making the user click again.
          const ok = await registerNative();
          if (!cancelled) setStatus(ok ? "granted" : "error");
        } else {
          setStatus("idle");
        }
        return;
      }

      if (typeof Notification === "undefined") {
        setStatus("unsupported");
      } else if (Notification.permission === "granted") {
        setStatus("granted");
      } else if (Notification.permission === "denied") {
        setStatus("denied");
      } else {
        setStatus("idle");
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setStatus("registering");
    try {
      const ok = Capacitor.isNativePlatform() ? await registerNative() : await registerWeb();
      setStatus(ok ? "granted" : "denied");
    } catch {
      setStatus("error");
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  if (status === "granted") {
    return <p className="px-1 py-2 text-xs text-foreground/50">{t("pushEnabled")}</p>;
  }

  return (
    <button
      onClick={handleEnable}
      disabled={status === "registering"}
      className="mb-2 w-full rounded-xl bg-brand-500/10 px-3 py-2 text-left text-xs font-medium text-brand-700 transition hover:bg-brand-500/20 disabled:opacity-60 dark:text-brand-400"
    >
      {status === "registering"
        ? t("pushEnabling")
        : status === "denied"
          ? t("pushDenied")
          : t("pushEnable")}
    </button>
  );
}
