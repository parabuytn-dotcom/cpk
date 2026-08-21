"use client";

import { useActionState } from "react";
import { createClass } from "@/lib/admin/actions";
import { useTranslations } from "next-intl";

export default function CreateClassForm() {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState(createClass, undefined);

  return (
    <form action={action} className="glass-surface flex flex-wrap items-end gap-3 rounded-2xl px-5 py-4">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium">{t("addClass")}</label>
        <input
          name="name"
          placeholder="7ème Base A"
          required
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        +
      </button>
      {state?.message && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.message}</p>}
    </form>
  );
}
