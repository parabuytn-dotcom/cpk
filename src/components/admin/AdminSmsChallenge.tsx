"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendAdminVerificationCode, verifyAdminCode } from "@/lib/admin/adminVerificationActions";

const COOLDOWN_SECONDS = 60;

export default function AdminSmsChallenge() {
  const [hint, setHint] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [sending, startSending] = useTransition();
  const [verifying, startVerifying] = useTransition();
  const started = useRef(false);

  function send(resend: boolean) {
    setError(null);
    setInfo(null);
    startSending(async () => {
      const result = await sendAdminVerificationCode(resend);
      if (result.success) {
        setHint(result.hint);
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
        if (resend) setInfo("Nouveau code envoyé.");
      } else {
        setError(result.error);
      }
    });
  }

  useEffect(() => {
    // Sent once on arrival; the server skips it if a live code already exists,
    // so a refresh doesn't text another one.
    if (started.current) return;
    started.current = true;
    send(false);
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const secondsLeft = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;

  function verify() {
    setError(null);
    startVerifying(async () => {
      const result = await verifyAdminCode(code);
      // On success the action redirects; a value only comes back on failure.
      if (result) {
        setError(result.error);
        setCode("");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="glass-surface flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl text-white shadow-lg">
          🔐
        </div>
        <h1 className="text-xl font-bold">Vérification de l&apos;espace admin</h1>

        <p className="text-sm text-foreground/70">
          {hint
            ? `Un code à 6 chiffres vient d'être envoyé par SMS au ${hint}.`
            : sending
              ? "Envoi du code par SMS…"
              : "Un code va être envoyé par SMS au numéro de vérification."}
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) verify();
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          placeholder="123456"
          aria-label="Code reçu par SMS"
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />

        <button
          type="button"
          onClick={verify}
          disabled={verifying || code.length < 6}
          className="w-full rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {verifying ? "Vérification…" : "Valider"}
        </button>

        <button
          type="button"
          onClick={() => send(true)}
          disabled={sending || secondsLeft > 0}
          className="text-sm font-medium text-brand-600 hover:underline disabled:text-foreground/40 disabled:no-underline"
        >
          {secondsLeft > 0 ? `Renvoyer le code (${secondsLeft}s)` : "Renvoyer le code"}
        </button>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {info && !error && <p className="text-sm text-green-600 dark:text-green-400">{info}</p>}
      </div>
    </div>
  );
}
