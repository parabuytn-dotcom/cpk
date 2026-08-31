"use client";

import { useState } from "react";

export default function DownloadAppButton({
  downloadMode,
  playstoreUrl,
}: {
  downloadMode: "apk" | "playstore";
  playstoreUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"choice" | "ios">("choice");

  function close() {
    setOpen(false);
    setView("choice");
  }

  const androidHref = downloadMode === "playstore" && playstoreUrl ? playstoreUrl : "/cpk-learn.apk";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-black/10 bg-white px-8 py-3 font-semibold shadow-lg transition hover:shadow-xl dark:border-white/10 dark:bg-gray-900"
      >
        Télécharger l&apos;app
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {view === "choice" ? (
              <>
                <h2 className="mb-4 text-center text-lg font-bold">Sur quel appareil ?</h2>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setView("ios")}
                    className="rounded-2xl bg-black/5 px-6 py-4 text-center font-semibold transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    📱 iPhone
                  </button>
                  <a
                    href={androidHref}
                    download={downloadMode === "playstore" ? undefined : "CPK-Learn.apk"}
                    target={downloadMode === "playstore" ? "_blank" : undefined}
                    rel={downloadMode === "playstore" ? "noopener noreferrer" : undefined}
                    onClick={close}
                    className="rounded-2xl bg-black/5 px-6 py-4 text-center font-semibold transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    🤖 Android
                  </a>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-2 text-center text-lg font-bold">Sur iPhone</h2>
                <p className="mb-4 text-sm text-foreground/70">
                  Appuie sur l&apos;icône Partager de Safari, puis « Sur l&apos;écran d&apos;accueil ».
                  L&apos;app apparaîtra comme une vraie application, notifications comprises.
                </p>
                <button
                  type="button"
                  onClick={() => setView("choice")}
                  className="w-full rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
                >
                  Retour
                </button>
              </>
            )}
            <button
              type="button"
              onClick={close}
              className="mt-3 w-full text-center text-xs text-foreground/50 transition hover:text-foreground"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
