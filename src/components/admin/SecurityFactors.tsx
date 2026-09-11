"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; friendlyName: string; status: string; type: string };
type TotpEnrollment = { factorId: string; qrCode: string; secret: string };

/**
 * Second factor on the admin account. Two kinds are offered on purpose:
 *
 * - WebAuthn (Face ID / Touch ID / Windows Hello) is the nicest to use, but
 *   Supabase ships it as an experimental factor that is DISABLED by default
 *   on a project — enrolling then fails with "MFA enroll is disabled for
 *   WebAuthn" until it's switched on in the dashboard.
 * - TOTP (Google Authenticator & co) is free and enabled on every Supabase
 *   project by default, so it always works and is the fallback that keeps
 *   the account protected even if WebAuthn can't be turned on.
 *
 * Either one satisfies the aal2 check in proxy.ts that guards /admin.
 *
 * A WebAuthn credential is bound to the DOMAIN it was created on: factors
 * enrolled on cpk-platform.vercel.app will NOT work on cpkef.tn and must be
 * re-enrolled there. TOTP has no such constraint.
 */
export default function SecurityFactors() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [totp, setTotp] = useState<TotpEnrollment | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) setError(listError.message);
    else {
      setFactors(
        (data?.all ?? []).map((f) => ({
          id: f.id,
          friendlyName: f.friendly_name ?? f.factor_type,
          status: f.status,
          type: f.factor_type,
        })),
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  async function enrollWebauthn() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: regError } = await supabase.auth.mfa.webauthn.register({
        friendlyName: `Face ID / Touch ID — ${new Date().toLocaleDateString("fr-FR")}`,
        webauthn: {},
      });
      if (regError) {
        setError(
          /disabled for WebAuthn/i.test(regError.message)
            ? "WebAuthn est désactivé sur le projet Supabase. Active-le dans Authentication → Multi-Factor Authentication, ou utilise l'application d'authentification ci-dessous (qui marche sans rien activer)."
            : regError.message,
        );
      } else {
        setInfo("Face ID enregistré. Il sera demandé à chaque accès à l'espace administration.");
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  async function startTotpEnrollment() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Application d'authentification — ${new Date().toLocaleDateString("fr-FR")}`,
    });
    if (enrollError) setError(enrollError.message);
    else if (data)
      setTotp({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setBusy(false);
  }

  async function confirmTotp() {
    if (!totp) return;
    setBusy(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totp.factorId,
    });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Échec de la vérification.");
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totp.factorId,
      challengeId: challenge.id,
      code: totpCode.trim(),
    });
    if (verifyError) setError(verifyError.message);
    else {
      setInfo("Application d'authentification enregistrée.");
      setTotp(null);
      setTotpCode("");
      await load();
    }
    setBusy(false);
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
  const buttonClass =
    "rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60";
  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
        <div>
          <h2 className="font-semibold">Vérification en deux étapes</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Une fois un moyen enregistré, il sera demandé à chaque accès à l&apos;espace
            administration, même si quelqu&apos;un connaît ton mot de passe.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-foreground/50">Chargement…</p>
        ) : verified.length === 0 ? (
          <p className="rounded-2xl bg-accent-500/10 px-4 py-3 text-sm text-accent-600 dark:text-accent-400">
            Aucune vérification active. Ton compte n&apos;est protégé que par un mot de passe.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {verified.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 px-4 py-3 dark:bg-white/5"
              >
                <span className="text-sm font-medium">
                  {factor.type === "webauthn" ? "🔐" : "📱"} {factor.friendlyName}
                </span>
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

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && <p className="text-sm text-green-600 dark:text-green-400">{info}</p>}
      </div>

      <div className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
        <h3 className="font-semibold">🔐 Face ID / Touch ID</h3>
        <p className="text-sm text-foreground/70">
          Le plus confortable. Nécessite que WebAuthn soit activé sur le projet Supabase
          (fonctionnalité encore en beta).
        </p>
        <button
          type="button"
          onClick={enrollWebauthn}
          disabled={busy}
          className={`self-start ${buttonClass}`}
        >
          {busy ? "…" : "Ajouter Face ID / Touch ID"}
        </button>
      </div>

      <div className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
        <h3 className="font-semibold">📱 Application d&apos;authentification</h3>
        <p className="text-sm text-foreground/70">
          Google Authenticator, Authy… Fonctionne immédiatement, sans rien activer, et n&apos;est
          liée ni à un appareil précis ni au domaine.
        </p>

        {totp ? (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={totp.qrCode}
              alt="QR code à scanner dans l'application d'authentification"
              className="h-48 w-48 self-start rounded-2xl border border-black/10 bg-white p-2 dark:border-white/10"
            />
            <p className="text-xs text-foreground/60">
              Scanne ce QR code, ou saisis cette clé manuellement :{" "}
              <code className="rounded bg-black/5 px-2 py-1 dark:bg-white/10">{totp.secret}</code>
            </p>
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="Code à 6 chiffres"
              className={`max-w-xs ${inputClass}`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmTotp}
                disabled={busy || totpCode.length < 6}
                className={buttonClass}
              >
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => {
                  setTotp(null);
                  setTotpCode("");
                }}
                disabled={busy}
                className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startTotpEnrollment}
            disabled={busy}
            className={`self-start ${buttonClass}`}
          >
            {busy ? "…" : "Ajouter une application d'authentification"}
          </button>
        )}
      </div>
    </div>
  );
}
