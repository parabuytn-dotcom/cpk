"use client";

import { useActionState } from "react";
import { upsertStaffMember } from "@/lib/admin/actions";
import { useTranslations } from "next-intl";

export default function StaffForm() {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState(upsertStaffMember, undefined);

  return (
    <form
      action={action}
      className="glass-surface grid gap-3 rounded-3xl p-6 sm:grid-cols-2"
      encType="multipart/form-data"
    >
      <h2 className="font-semibold sm:col-span-2">{t("addStaffMember")}</h2>
      <input
        name="fullName"
        placeholder="Nom complet"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <input
        name="roleTitle"
        placeholder="Poste (ex: Surveillant général)"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="showPhoto" defaultChecked className="h-4 w-4" />
        Afficher la photo publiquement (choix de la personne)
      </label>
      <input
        type="file"
        name="photo"
        accept="image/*"
        className="text-sm sm:col-span-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        {t("addStaffMember")}
      </button>
      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400 sm:col-span-2">{state.success}</p>
      )}
    </form>
  );
}
