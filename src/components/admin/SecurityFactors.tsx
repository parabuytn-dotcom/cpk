"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendlyName: string; status: string };

/**
 * Face ID / Touch ID / Windows Hello as a second factor on the admin
 * account, via WebAuthn (Supabase MFA "webauthn" factor).
 *
 * Two things worth knowing before touching this:
 * - Supabase's WebAuthn MFA is flagged experimental, so the API can change.
 *   Everything here degrades to a readable error rather than a blank screen.
 * - A credential is bound to the DOMAIN it was created on (the WebAuthn
 *   "relying party"). Factors enrolled on cpk-platform.vercel.app will NOT
 *   work once the site moves to cpkef.tn — they have to be re-enrolled from
 *   the new domain, so keep a second factor or the recovery path in mind
 *   before switching.
 */
export default function SecurityFactors() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) setError(listError.message);
    else {
      const all = [...(data?.all ?? [])];
      setFactors(
        all
          .filter((f) => f.factor_type === "webauthn" || f.factor_type === "totp")
          .map((f) => ({
            id: f.id,
            friendlyName: f.friendly_name ?? f.factor_type,
            status: f.status,
          })),
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  async function enroll() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { data, error: regError } = await supabase.auth.mfa.webauthn.register({
        friendlyName: `Face ID / Touch ID — ${new Date().toLocaleDateString("fr-FR")}`,
        webauthn: {},
      });
      if (regError) {
        setError(
          regError.message ||
            "Échec de l'enregistrement. Vérifie que la MFA WebAuthn est activée sur le projet Supabase.",
        );
      } else if (data) {
        setInfo("Face ID enregistré. Il sera demandé à chaque accès à l'espace administration.");
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(factorId: string) {
    if (!confirm("Supprimer ce moyen d'authentification ? Ton compte sera moins protégé.")) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) setError(unenrollError.message);
    else await load();
    setBusy(false);
  }

  const verified = factors.filter((f) => f.status === "verified");

  return (
    <div className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
      <div>
        <h2 className="font-semibold">Face ID / Touch ID</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Ajoute une vérification biométrique à ton compte administrateur. Une fois activée, elle
          sera demandée à chaque accès à l&apos;espace administration, même si quelqu&apos;un
          connaît ton mot de passe.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-foreground/50">Chargement…</p>
      ) : verified.length === 0 ? (
        <p className="rounded-2xl bg-accent-500/10 px-4 py-3 text-sm text-accent-600 dark:text-accent-400">
          Aucune vérification biométrique active. Ton compte n&apos;est protégé que par un mot de
          passe.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {verified.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5"
            >
              <span className="text-sm font-medium">🔐 {factor.friendlyName}</span>
              <button
                type="button"
                onClick={() => remove(factor.id)}
                disabled={busy}
                className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={enroll}
        disabled={busy}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "…" : "Ajouter Face ID / Touch ID"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {info && <p className="text-sm text-green-600 dark:text-green-400">{info}</p>}
    </div>
  );
}
