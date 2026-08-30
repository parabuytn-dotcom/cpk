"use client";

import { useEffect } from "react";
import { pingPresence } from "@/lib/presence/actions";

const INTERVAL_MS = 60_000;

/** Invisible — pings `last_seen_at` on mount, then every 60s while the tab is visible. */
export default function PresenceHeartbeat() {
  useEffect(() => {
    pingPresence();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") pingPresence();
    }, INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") pingPresence();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
