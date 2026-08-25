"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { resetChildPassword } from "@/lib/admin/actions";

export default function ResetChildPasswordButton({ studentId }: { studentId: string }) {
  const t = useTranslations("accountCreation");
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<
    { success: true; email: string; password: string } | { success: false; error: string } | null
  >(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await resetChildPassword(studentId, password);
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">
        <p className="font-medium">{t("resetNote")}</p>
        <p className="mt-1 font-mono">
          {result.email} / {result.password}
        </p>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground/60 transition hover:border-brand-500/50 hover:text-foreground dark:border-white/10"
      >
        {t("resetPassword")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("choosePassword")}
        minLength={6}
        required
        autoFocus
        className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? t("resetting") : t("confirm")}
      </button>
      <p className="w-full text-xs text-foreground/50">{t("resetConfirm")}</p>
      {result?.success === false && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
    </form>
  );
}
