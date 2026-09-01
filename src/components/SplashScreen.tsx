"use client";

import { useEffect, useState } from "react";

const HOLD_MS = 900;
const FADE_MS = 450;

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    // Skip on the native Android app: it already shows its own launch splash
    // before the WebView even starts loading this page, so playing this one
    // too would just be a second, redundant reveal right after the first.
    let isNative = false;
    try {
      isNative = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    } catch {
      isNative = false;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isNative || reducedMotion) {
      const skip = setTimeout(() => setPhase("done"), 0);
      return () => clearTimeout(skip);
    }

    document.body.style.overflow = "hidden";
    const toOut = setTimeout(() => setPhase("out"), HOLD_MS);
    const toDone = setTimeout(() => setPhase("done"), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(toOut);
      clearTimeout(toDone);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (phase === "done") document.body.style.overflow = "";
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)] ${
        phase === "out" ? "animate-splash-out" : ""
      }`}
    >
      <span className="animate-splash-logo flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-xl sm:h-24 sm:w-24 sm:text-3xl">
        CPK
      </span>
      <span className="animate-splash-word text-center text-sm font-medium tracking-wide text-foreground/60 sm:text-base">
        Collège Pilote du Kef
      </span>
    </div>
  );
}
