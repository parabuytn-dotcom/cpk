"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfileInfo } from "@/lib/auth/actions";
import type { CurrentProfile } from "@/lib/auth/session";

export default function EditProfileForm({ profile }: { profile: CurrentProfile }) {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(updateProfileInfo, undefined);

  return (
    <form action={action} className="glass-surface grid gap-3 rounded-2xl px-5 py-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{t("editTitle")}</h2>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("fullName")}</label>
        <input
          name="fullName"
          defaultValue={
            profile.fullName ??
            `${profile.parentFirstName ?? ""} ${profile.parentLastName ?? ""}`.trim()
          }
          required
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.fullName?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("phone")}</label>
        <input
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          placeholder="99766801"
          required
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.phone?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("cin")}</label>
        <input
          name="cin"
          defaultValue={profile.cin ?? ""}
          placeholder="12345678"
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.cin?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t("contactEmail")}</label>
        <input
          name="contactEmail"
          type="email"
          defaultValue={profile.contactEmail ?? ""}
          placeholder="toi@example.com"
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        {state?.errors?.contactEmail?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? t("saving") : t("save")}
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
