"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Second-factor gate for the admin area: prompts Face ID / Touch ID and, on
 * success, the session is elevated to AAL2 so proxy.ts lets /admin through.
 */
export default function SecurityChallenge({ locale }: { locale: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    setStatus("verifying");
    setError(null);
    try {
      const { data: factorData, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw new Error(listError.message);

      const factor = (factorData?.all ?? []).find(
        (f) => f.factor_type === "webauthn" && f.status === "verified",
      );
      if (!factor) {
        setError("Aucun moyen de vérification enregistré sur ce compte.");
        setStatus("error");
        return;
      }

      const { error: authError } = await supabase.auth.mfa.webauthn.authenticate({
        factorId: factor.id,
        webauthn: {},
      });
      if (authError) throw new Error(authError.message);

      // The session cookie now carries aal2 — go back to the admin area.
      router.replace(`/${locale}/admin`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vérification échouée.");
      setStatus("error");
    }
  }, [supabase, router, locale]);

  // Prompt immediately: the whole point of this page is the biometric check.
  // Deferred by a tick so the first state update doesn't happen synchronously
  // inside the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = setTimeout(verify, 0);
    return () => clearTimeout(id);
  }, [verify]);

  return (
    <div className="mx-auto max-w-md">
      <div className="glass-surface flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg">
          🔐
        </div>
        <h1 className="text-xl font-bold">Vérification de sécurité</h1>
        <p className="text-sm text-foreground/70">
          L&apos;espace administration demande une vérification biométrique (Face ID, Touch ID ou
          Windows Hello).
        </p>

        {status === "verifying" && <p className="text-sm text-foreground/50">Vérification…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="button"
          onClick={verify}
          disabled={status === "verifying"}
          className="w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {status === "verifying" ? "…" : "Vérifier"}
        </button>
      </div>
    </div>
  );
}
