"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createChildAccount, type ChildAccountResult } from "@/lib/admin/actions";

export default function ChildAccountButton({ studentId }: { studentId: string }) {
  const t = useTranslations("accountCreation");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ChildAccountResult | null>(null);

  function handleCreate() {
    startTransition(async () => {
      setResult(await createChildAccount(studentId));
    });
  }

  if (result?.success) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-4 text-sm">
        <p className="font-medium">{t("qrCreated")}</p>

        {/* Plain <img>: the source is a data: URL, which next/image rejects. */}
        <img
          src={result.qrDataUrl}
          alt={t("qrAlt")}
          className="h-52 w-52 self-start rounded-xl bg-white p-2 shadow-sm"
        />

        <p className="text-xs text-foreground/60">{t("qrValidity")}</p>

        <a
          href={result.url}
          className="break-all text-xs font-medium text-brand-600 underline"
        >
          {result.url}
        </a>

        <p className="text-xs text-foreground/60">
          {result.sentBySms && result.sentByEmail
            ? t("qrSentBoth")
            : result.sentBySms
              ? t("qrSentSms")
              : result.sentByEmail
                ? t("qrSentEmail")
                : t("qrSentNeither")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleCreate}
        disabled={isPending}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? t("creating") : t("createChild")}
      </button>
      {result?.success === false && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
    </div>
  );
}
