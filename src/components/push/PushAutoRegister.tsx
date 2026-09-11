"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { registerNativeToken, registerWebToken, listenForegroundMessages } from "@/lib/push/register";

/**
 * Headless: keeps the push token registered on every app start, for anyone
 * who has already granted permission.
 *
 * This exists because the only place that used to register a token was the
 * toggle inside the notification bell dropdown — so a device where the user
 * had granted permission but never re-opened that dropdown ended up with
 * permission granted and NO token stored, which is silently indistinguishable
 * from working: the UI said "notifications enabled" and nothing ever arrived.
 * It also matters because FCM rotates web tokens, so a token saved once can
 * simply go stale.
 *
 * Never prompts on its own: on web it only runs when permission is already
 * "granted", and on native only when checkPermissions() already says granted.
 * Asking is still the toggle's job.
 */
export default function PushAutoRegister() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    let cancelled = false;

    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          const perm = await PushNotifications.checkPermissions();
          if (cancelled || perm.receive !== "granted") return;
          await registerNativeToken();
          return;
        }

        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        await registerWebToken();
        if (cancelled) return;
        await listenForegroundMessages();
      } catch {
        // Best-effort: in-site notifications still work without push.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
