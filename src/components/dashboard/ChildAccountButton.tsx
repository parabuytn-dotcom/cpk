"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createChildAccount } from "@/lib/admin/actions";

export default function ChildAccountButton({ studentId }: { studentId: string }) {
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
      const res = await createChildAccount(studentId, password);
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">
        <p className="font-medium">{t("createdNote")}</p>
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
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
      >
        {t("createChild")}
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
        {isPending ? t("creating") : t("confirm")}
      </button>
      {result?.success === false && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
    </form>
  );
}
