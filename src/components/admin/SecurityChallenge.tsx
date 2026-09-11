"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "webauthn" | "totp" | "none";

/**
 * Second-factor gate for the admin area. Handles both factor kinds so the
 * page works whichever one is enrolled (see SecurityFactors): WebAuthn
 * prompts the biometric straight away, TOTP asks for the 6-digit code. On
 * success the session is elevated to aal2 and proxy.ts lets /admin through.
 */
export default function SecurityChallenge({ locale }: { locale: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function done() {
    router.replace(`/${locale}/admin`);
    router.refresh();
  }

  const verifyWebauthn = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        const { error: authError } = await supabase.auth.mfa.webauthn.authenticate({
          factorId: id,
          webauthn: {},
        });
        if (authError) throw new Error(authError.message);
        done();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vérification échouée.");
      } finally {
        setBusy(false);
      }
    },
    // `done` only closes over router/locale, both stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase],
  );

  const init = useCallback(async () => {
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError(listError.message);
      setMode("none");
      return;
    }

    const all = (data?.all ?? []).filter((f) => f.status === "verified");
    const webauthn = all.find((f) => f.factor_type === "webauthn");
    const totp = all.find((f) => f.factor_type === "totp");

    if (webauthn) {
      setFactorId(webauthn.id);
      setMode("webauthn");
      verifyWebauthn(webauthn.id);
    } else if (totp) {
      setFactorId(totp.id);
      setMode("totp");
    } else {
      setMode("none");
    }
  }, [supabase, verifyWebauthn]);

  useEffect(() => {
    const id = setTimeout(init, 0);
    return () => clearTimeout(id);
  }, [init]);

  async function verifyTotp() {
    if (!factorId) return;
    setBusy(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Échec de la vérification.");
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) {
      setError(verifyError.message);
      setBusy(false);
      return;
    }
    done();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="glass-surface flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg">
          🔐
        </div>
        <h1 className="text-xl font-bold">Vérification de sécurité</h1>

        {mode === "loading" && <p className="text-sm text-foreground/50">Chargement…</p>}

        {mode === "none" && (
          <p className="text-sm text-foreground/70">
            Aucun moyen de vérification enregistré sur ce compte.
          </p>
        )}

        {mode === "webauthn" && (
          <>
            <p className="text-sm text-foreground/70">
              L&apos;espace administration demande une vérification biométrique (Face ID, Touch ID
              ou Windows Hello).
            </p>
            <button
              type="button"
              onClick={() => factorId && verifyWebauthn(factorId)}
              disabled={busy}
              className="w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Vérification…" : "Vérifier"}
            </button>
          </>
        )}

        {mode === "totp" && (
          <>
            <p className="text-sm text-foreground/70">
              Saisis le code à 6 chiffres affiché par ton application d&apos;authentification.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="123456"
              className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
            />
            <button
              type="button"
              onClick={verifyTotp}
              disabled={busy || code.trim().length < 6}
              className="w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Vérification…" : "Vérifier"}
            </button>
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
