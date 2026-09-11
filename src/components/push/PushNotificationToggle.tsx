"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslations } from "next-intl";
import {
  isIosSafariTab,
  registerNativeToken,
  registerWebToken,
  listenForegroundMessages,
} from "@/lib/push/register";

type Status =
  | "checking"
  | "idle"
  | "unsupported"
  | "ios-add-to-home"
  | "denied"
  | "registering"
  | "granted"
  | "error";

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
          const ok = await registerNativeToken();
          if (!cancelled) setStatus(ok ? "granted" : "error");
        } else {
          setStatus("idle");
        }
        return;
      }

      if (typeof Notification === "undefined") {
        setStatus(isIosSafariTab() ? "ios-add-to-home" : "unsupported");
      } else if (Notification.permission === "granted") {
        // Permission alone isn't enough — without an FCM token on the server
        // nothing can ever be delivered, and web tokens rotate. Refresh it
        // silently instead of just showing "enabled".
        const ok = await registerWebToken();
        if (cancelled) return;
        setStatus(ok ? "granted" : "error");
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
      const ok = Capacitor.isNativePlatform() ? await registerNativeToken() : await registerWebToken();
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
