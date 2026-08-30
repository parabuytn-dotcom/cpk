"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { submitSuggestion } from "@/lib/suggestions/actions";

export default function SuggestionComposer() {
  const t = useTranslations("suggestions");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitSuggestion, undefined);

  if (state?.success) {
    return (
      <div className="glass-surface rounded-3xl p-6 text-center text-green-700 dark:text-green-400">
        {state.success}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-surface w-full rounded-3xl px-6 py-4 text-center font-semibold transition hover:shadow-lg"
      >
        {t("submitButton")}
      </button>
    );
  }

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      <textarea
        name="content"
        placeholder={t("placeholder")}
        rows={4}
        required
        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      {state?.errors?.content?.map((err) => (
        <p key={err} className="text-xs text-red-600 dark:text-red-400">
          {err}
        </p>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? t("sending") : t("send")}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
    </form>
  );
}
