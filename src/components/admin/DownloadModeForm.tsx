"use client";

import { useActionState, useState } from "react";
import { updateDownloadSettings } from "@/lib/admin/actions";

export default function DownloadModeForm({
  initialMode,
  initialPlaystoreUrl,
}: {
  initialMode: string;
  initialPlaystoreUrl: string;
}) {
  const [state, action, pending] = useActionState(updateDownloadSettings, undefined);
  const [mode, setMode] = useState(initialMode === "playstore" ? "playstore" : "apk");

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <p className="text-sm font-medium">Téléchargement Android</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("apk")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "apk"
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Fichier APK direct
        </button>
        <button
          type="button"
          onClick={() => setMode("playstore")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "playstore"
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Lien Play Store
        </button>
      </div>
      <input type="hidden" name="downloadMode" value={mode} />

      <input
        name="playstoreUrl"
        type="url"
        defaultValue={initialPlaystoreUrl}
        placeholder="https://play.google.com/store/apps/details?id=..."
        disabled={mode !== "playstore"}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
      />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
