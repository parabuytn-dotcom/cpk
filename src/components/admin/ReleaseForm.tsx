"use client";

import { useActionState } from "react";
import { publishRelease } from "@/lib/admin/actions";
import { useTranslations } from "next-intl";

export default function ReleaseForm() {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState(publishRelease, undefined);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      <input
        name="title"
        placeholder="Titre"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <textarea
        name="body"
        placeholder="Contenu"
        rows={4}
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {t("publish")}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
      )}
    </form>
  );
}
