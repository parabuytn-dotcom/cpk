"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendQrLoginOtp, resendQrLoginOtp, verifyQrLoginOtp } from "@/lib/auth/actions";
import QrPasswordForm from "@/components/auth/QrPasswordForm";

const COOLDOWN_SECONDS = 90;

function maskPhone(phone: string) {
  if (phone.length <= 2) return phone;
  return "•".repeat(phone.length - 2) + phone.slice(-2);
}

export default function QrLoginOtpForm({ token, phone }: { token: string; phone: string }) {
  const [mode, setMode] = useState<"loading" | "otp" | "password">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const [verifyPending, startVerify] = useTransition();
  const [resendPending, startResend] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    sendQrLoginOtp(token).then((result) => {
      if (result.success) {
        setMode("otp");
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
      } else {
        setMode("password");
      }
    });
  }, [token]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const secondsLeft = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;

  function handleVerify() {
    setError(null);
    startVerify(async () => {
      const result = await verifyQrLoginOtp(token, code.trim());
      // On success the action redirects server-side, so `result` is
      // undefined — nothing left to show, the page is navigating away.
      if (!result) return;
      if (result.attemptsExhausted) {
        setFallbackNote("Trop de tentatives incorrectes. Entre ton mot de passe pour continuer.");
        setMode("password");
      } else {
        setError(result.message);
        setCode("");
      }
    });
  }

  function handleResend() {
    setError(null);
    setInfo(null);
    startResend(async () => {
      const result = await resendQrLoginOtp(token);
      if (result.success) {
        setInfo("Nouveau code envoyé.");
        setCooldownUntil(Date.now() + COOLDOWN_SECONDS * 1000);
        setCode("");
      } else {
        setError(result.message ?? "Impossible d'envoyer le code.");
      }
    });
  }

  if (mode === "password") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/60">
          {fallbackNote ?? "Entre le mot de passe que tu as choisi pour continuer."}
        </p>
        <QrPasswordForm token={token} />
      </div>
    );
  }

  if (mode === "loading") {
    return <p className="text-sm text-foreground/50">Envoi du code par SMS…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/70">
        Un code de vérification a été envoyé par SMS au {maskPhone(phone)}.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">Code reçu par SMS</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          autoFocus
          placeholder="123456"
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </div>

      <button
        type="button"
        onClick={handleVerify}
        disabled={verifyPending || code.trim().length < 6}
        className="rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {verifyPending ? "Vérification…" : "Se connecter"}
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendPending || secondsLeft > 0}
        className="self-start text-sm font-medium text-brand-600 hover:underline disabled:text-foreground/40 disabled:no-underline"
      >
        {secondsLeft > 0 ? `Renvoyer le code (${secondsLeft}s)` : "Renvoyer le code"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {info && !error && <p className="text-sm text-green-600 dark:text-green-400">{info}</p>}
    </div>
  );
}
