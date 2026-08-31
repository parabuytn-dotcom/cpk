"use client";

import { useEffect, useRef } from "react";

type JitsiApi = {
  addEventListener: (event: string, callback: () => void) => void;
  dispose: () => void;
};

type JitsiExternalApiConstructor = new (
  domain: string,
  options: {
    roomName: string;
    parentNode: HTMLElement;
    width: string;
    height: string;
    userInfo: { displayName: string };
    configOverwrite: Record<string, unknown>;
    interfaceConfigOverwrite: Record<string, unknown>;
  },
) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiExternalApiConstructor;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Jitsi."));
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

export default function JitsiCall({
  roomSlug,
  displayName,
  onClose,
}: {
  roomSlug: string;
  displayName: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;

        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName: roomSlug,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        });
        api.addEventListener("readyToClose", onClose);
        apiRef.current = api;
      })
      .catch(() => {
        // Swallowed — the container just stays empty; the user can retry by
        // toggling the tab, which re-runs this effect.
      });

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug]);

  return (
    <div
      ref={containerRef}
      className="h-[70vh] w-full overflow-hidden rounded-3xl bg-black shadow-lg"
    />
  );
}
