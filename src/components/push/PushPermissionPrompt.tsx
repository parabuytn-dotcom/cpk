"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslations } from "next-intl";
import {
  isIosSafariTab,
  listenForegroundMessages,
  registerNativeToken,
  registerWebToken,
} from "@/lib/push/register";

// Once per visit, not once ever: the whole point is that families who dismiss
// it (or never understood it) are asked again next time they open the site.
const DISMISSED_KEY = "cpk_push_prompt_dismissed";

type Prompt = "ask" | "blocked" | "ios-add-to-home";
type Status = "hidden" | Prompt | "registering" | "enabled" | "failed";

/** Other full-screen overlays (splash, tour, validation, announcements) carry this attribute. */
function blockingModalOpen() {
  return document.querySelector("[data-blocking-modal]") !== null;
}

function dismissedThisVisit() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage blocked: it will simply ask again on the next page load.
  }
}

/**
 * Where notifications are turned on. Used to be a small button inside the
 * bell menu, which parents who aren't used to apps never found. Now, on every
 * visit of a signed-in person:
 *   - permission already granted → the device token is refreshed silently;
 *   - not decided yet            → a full-screen prompt with one big button
 *     (browsers only show their permission dialog after a tap);
 *   - blocked                    → how to unblock it on their device;
 *   - iPhone in a Safari tab     → how to add the site to the home screen,
 *     the only way iOS allows notifications for a website.
 * It waits for the splash screen, the tour and other popups to close first.
 */
export default function PushPermissionPrompt() {
  const t = useTranslations("pushPrompt");
  const [status, setStatus] = useState<Status>("hidden");
  const [platform, setPlatform] = useState<"native" | "ios" | "web">("web");
  const pendingPrompt = useRef<Prompt | null>(null);

  // 1. Work out where this device stands.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          setPlatform("native");
          const { PushNotifications } = await import("@capacitor/push-notifications");
          const perm = await PushNotifications.checkPermissions();
          if (cancelled) return;
          if (perm.receive === "granted") {
            await registerNativeToken();
            return;
          }
          pendingPrompt.current = perm.receive === "denied" ? "blocked" : "ask";
        } else if (typeof Notification === "undefined") {
          if (!isIosSafariTab()) return; // browser without push at all: nothing to offer
          setPlatform("ios");
          pendingPrompt.current = "ios-add-to-home";
        } else if (Notification.permission === "granted") {
          // Tokens rotate; keep the server's copy fresh without bothering anyone.
          if (await registerWebToken()) await listenForegroundMessages();
          return;
        } else {
          pendingPrompt.current = Notification.permission === "denied" ? "blocked" : "ask";
        }
      } catch {
        return; // in-site notifications keep working without push
      }

      if (cancelled || dismissedThisVisit()) return;

      // 2. Show it once nothing else covers the screen.
      const show = () => {
        if (cancelled || !pendingPrompt.current) return false;
        if (blockingModalOpen()) return false;
        setStatus(pendingPrompt.current);
        return true;
      };
      if (show()) return;
      timer = window.setInterval(() => {
        if (show()) window.clearInterval(timer);
      }, 1000);
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function enable() {
    setStatus("registering");
    try {
      const ok = platform === "native" ? await registerNativeToken() : await registerWebToken();
      if (ok) {
        if (platform === "web") await listenForegroundMessages();
        setStatus("enabled");
        window.setTimeout(() => setStatus("hidden"), 2200);
        return;
      }
      // The system dialog was refused (or dismissed): show how to change it later.
      const denied =
        platform === "native" || (typeof Notification !== "undefined" && Notification.permission === "denied");
      setStatus(denied ? "blocked" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  function later() {
    rememberDismissed();
    setStatus("hidden");
  }

  if (status === "hidden") return null;

  const icon = status === "enabled" ? "✓" : status === "ios-add-to-home" ? "📲" : "🔔";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-prompt-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="glass-surface w-full max-w-md rounded-3xl p-7 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg">
          {icon}
        </div>

        {status === "enabled" ? (
          <h2 id="push-prompt-title" className="text-xl font-bold">
            {t("enabledTitle")}
          </h2>
        ) : status === "ios-add-to-home" ? (
          <>
            <h2 id="push-prompt-title" className="text-xl font-bold">
              {t("iosTitle")}
            </h2>
            <p className="mt-3 text-sm text-foreground/80">{t("iosBody")}</p>
            <ol className="mt-4 flex flex-col gap-2 text-start text-sm">
              <li className="rounded-2xl bg-black/5 px-4 py-2.5 dark:bg-white/10">{t("iosStep1")}</li>
              <li className="rounded-2xl bg-black/5 px-4 py-2.5 dark:bg-white/10">{t("iosStep2")}</li>
              <li className="rounded-2xl bg-black/5 px-4 py-2.5 dark:bg-white/10">{t("iosStep3")}</li>
            </ol>
          </>
        ) : status === "blocked" ? (
          <>
            <h2 id="push-prompt-title" className="text-xl font-bold">
              {t("blockedTitle")}
            </h2>
            <p className="mt-3 text-sm text-foreground/80">{t("blockedBody")}</p>
            <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-start text-sm dark:bg-white/10">
              {platform === "native" ? t("blockedStepsApp") : t("blockedStepsBrowser")}
            </p>
          </>
        ) : (
          <>
            <h2 id="push-prompt-title" className="text-xl font-bold">
              {t("askTitle")}
            </h2>
            <p className="mt-3 text-sm text-foreground/80">{t("askBody")}</p>
            {status === "failed" && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t("failed")}</p>
            )}
            <button
              type="button"
              onClick={enable}
              disabled={status === "registering"}
              className="mt-6 w-full rounded-full bg-brand-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {status === "registering" ? t("enabling") : t("enable")}
            </button>
            {status === "registering" && <p className="mt-2 text-xs text-foreground/60">{t("enablingHint")}</p>}
          </>
        )}

        {status !== "enabled" && status !== "registering" && (
          <button
            type="button"
            onClick={later}
            className={`w-full rounded-full px-4 py-3 text-sm font-medium transition ${
              status === "ask" || status === "failed"
                ? "mt-2 text-foreground/60 hover:bg-black/5 dark:hover:bg-white/10"
                : "mt-6 bg-brand-600 font-semibold text-white shadow-md hover:bg-brand-700"
            }`}
          >
            {status === "ask" || status === "failed" ? t("later") : t("understood")}
          </button>
        )}
      </div>
    </div>
  );
}
