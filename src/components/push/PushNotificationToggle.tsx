"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslations } from "next-intl";
import { registerPushToken } from "@/lib/push/actions";

type Status =
  | "checking"
  | "idle"
  | "unsupported"
  | "ios-add-to-home"
  | "denied"
  | "registering"
  | "granted"
  | "error";

// iOS Safari only exposes the Notification/Push API to a site that's been
// added to the home screen and launched from there (standalone display
// mode) — in a regular browser tab `window.Notification` doesn't exist at
// all, on any iOS version. This isn't a bug to work around; the only fix is
// telling the user how to add the site to their home screen.
function isIosSafariTab() {
  if (typeof navigator === "undefined") return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return isIOS && !isStandalone;
}

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

// Firebase only routes a push through the service worker's
// onBackgroundMessage when the tab is NOT focused. With the tab open and
// active (the common case while testing), the message instead arrives here
// — without this listener it's received by the SDK but never shown as a
// notification at all.
async function listenForegroundMessages() {
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

export default function PushNotificationToggle() {
  const t = useTranslations("notificationsUi");
  const [status, setStatus] = useState<Status>("checking");
  const listening = useRef(false);

  useEffect(() => {
    if (status !== "granted" || Capacitor.isNativePlatform() || listening.current) return;
    listening.current = true;
    listenForegroundMessages();
  }, [status]);

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
        setStatus(isIosSafariTab() ? "ios-add-to-home" : "unsupported");
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

  if (status === "ios-add-to-home") {
    return (
      <p className="mb-2 rounded-xl bg-brand-500/10 px-3 py-2 text-xs text-brand-700 dark:text-brand-400">
        {t("pushIosAddToHome")}
      </p>
    );
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
