"use client";

import { useState, useTransition } from "react";
import { generateLoginQrCode } from "@/lib/admin/actions";

export default function GenerateLoginQrButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { url: string; qrDataUrl: string; expiresAt: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await generateLoginQrCode(profileId);
      if (res.success) {
        setResult({ url: res.url, qrDataUrl: res.qrDataUrl, expiresAt: res.expiresAt });
      } else {
        setError(res.error);
      }
    });
  }

  async function copyLink() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={generate}
        disabled={isPending}
        className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? "Génération…" : "📱 Générer un code QR de connexion"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="glass-surface w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl">
            <h2 className="text-xl font-bold">Code de connexion</h2>
            <p className="mt-2 text-sm text-foreground/70">
              À usage unique — la personne qui scanne est connectée directement et doit
              immédiatement choisir son mot de passe. Une fois scanné, ce code ne fonctionne
              plus.
            </p>

            <img
              src={result.qrDataUrl}
              alt="QR code de connexion"
              className="mx-auto my-6 h-56 w-56 rounded-2xl border border-black/10 bg-white p-2 dark:border-white/10"
            />

            <p className="break-all rounded-xl bg-black/5 px-3 py-2 text-xs text-foreground/70 dark:bg-white/10">
              {result.url}
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="mt-3 w-full rounded-full border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              {copied ? "Lien copié ✓" : "Copier le lien"}
            </button>

            <p className="mt-3 text-xs text-foreground/50">
              Expire le {new Date(result.expiresAt).toLocaleDateString("fr-FR")} si non utilisé.
            </p>

            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-6 w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
