"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitHelpRequest } from "@/lib/admin/actions";

export default function HelpForm() {
  const t = useTranslations("help");
  const [state, action, pending] = useActionState(submitHelpRequest, undefined);

  if (state?.success) {
    return (
      <div className="glass-surface rounded-3xl p-6 text-center text-green-700 dark:text-green-400">
        {state.success}
      </div>
    );
  }

  return (
    <form action={action} className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">{t("subject")}</label>
        <input
          name="subject"
          required
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.subject?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{t("description")}</label>
        <textarea
          name="description"
          rows={5}
          required
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.description?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {t("submit")}
      </button>
      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}
