"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useTranslations } from "next-intl";

export default function QrScanner() {
  const t = useTranslations("onboarding");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setError(t("scanCameraError"));
      }
    }

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code?.data) {
            let target: URL;
            try {
              target = new URL(code.data);
            } catch {
              setError(t("scanInvalid"));
              rafId = requestAnimationFrame(tick);
              return;
            }

            // Only follow QR codes pointing back at our own qr-login
            // endpoint — anything else is either not one of our printed
            // documents or a spoofed code trying to redirect elsewhere.
            if (target.origin === window.location.origin && target.pathname.startsWith("/api/qr-login/")) {
              cancelled = true;
              stream?.getTracks().forEach((track) => track.stop());
              window.location.href = target.toString();
              return;
            }

            setError(t("scanInvalid"));
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass-surface mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl p-6">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <p className="text-sm text-foreground/60">{t("scanHint")}</p>
      )}
    </div>
  );
}
