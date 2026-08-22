"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateOwnPhone } from "@/lib/auth/actions";

export default function PhonePrompt() {
  const t = useTranslations("phonePrompt");
  const [state, action, pending] = useActionState(updateOwnPhone, undefined);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
        {state.success}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="glass-surface flex flex-wrap items-end gap-3 rounded-2xl px-5 py-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">{t("label")}</label>
        <input
          name="phone"
          type="tel"
          placeholder="99766801"
          required
          className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {t("save")}
      </button>
      {state?.message && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}
