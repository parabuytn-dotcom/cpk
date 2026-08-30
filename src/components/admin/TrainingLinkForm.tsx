"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateSiteSetting } from "@/lib/admin/actions";

export default function TrainingLinkForm({ initialValue }: { initialValue: string }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState(updateSiteSetting, undefined);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <input type="hidden" name="key" value="training_url" />
      <label className="text-sm font-medium" htmlFor="training_url">
        {t("trainingUrlLabel")}
      </label>
      <input
        id="training_url"
        name="value"
        type="url"
        defaultValue={initialValue}
        placeholder={t("trainingUrlPlaceholder")}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? t("saving") : t("save")}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{t("saved")}</p>}
    </form>
  );
}
