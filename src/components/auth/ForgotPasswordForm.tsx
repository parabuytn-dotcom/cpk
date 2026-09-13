"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset, resetPasswordWithCode } from "@/lib/auth/passwordReset";

export default function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("forgotPassword");
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState<{ channel: "email" | "sms"; hint: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5";

  function handleRequest() {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(phone.trim());
      if (result.success) setSentTo({ channel: result.channel, hint: result.hint });
      else setError(result.error);
    });
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordWithCode(phone.trim(), code, password);
      if (result.success) {
        setDone(true);
        router.replace(`/${locale}/login`);
      } else {
        setError(result.error ?? t("genericError"));
      }
    });
  }

  return (
    <div className="glass-surface mx-auto max-w-md rounded-3xl p-8">
      <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>

      {!sentTo && (
        <>
          <p className="mb-6 text-sm text-foreground/60">{t("intro")}</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="numeric"
                placeholder="99766801"
                autoFocus
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleRequest}
              disabled={isPending || !/^\d{8}$/.test(phone.trim())}
              className="rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? t("sending") : t("sendCode")}
            </button>
          </div>
        </>
      )}

      {sentTo && !done && (
        <>
          <p className="mb-6 text-sm text-foreground/60">
            {sentTo.channel === "email"
              ? t("sentByEmail", { hint: sentTo.hint })
              : t("sentBySms", { hint: sentTo.hint })}
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("code")}</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                autoFocus
                className={`${inputClass} text-center text-lg tracking-[0.3em]`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("newPassword")}</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                minLength={6}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending || code.trim().length < 6 || password.length < 6}
              className="rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? t("saving") : t("submit")}
            </button>
            <button
              type="button"
              onClick={handleRequest}
              disabled={isPending}
              className="self-start text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
            >
              {t("resend")}
            </button>
          </div>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <p className="mt-6 text-center text-sm text-foreground/60">
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
