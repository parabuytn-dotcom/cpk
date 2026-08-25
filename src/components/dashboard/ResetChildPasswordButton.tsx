"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { resetChildPassword } from "@/lib/admin/actions";

export default function ResetChildPasswordButton({ studentId }: { studentId: string }) {
  const t = useTranslations("accountCreation");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { success: true; email: string; password: string } | { success: false; error: string } | null
  >(null);

  function handleClick() {
    if (!confirm(t("resetConfirm"))) return;
    startTransition(async () => {
      const res = await resetChildPassword(studentId);
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

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground/60 transition hover:border-brand-500/50 hover:text-foreground disabled:opacity-60 dark:border-white/10"
      >
        {isPending ? t("resetting") : t("resetPassword")}
      </button>
      {result?.success === false && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
    </div>
  );
}
