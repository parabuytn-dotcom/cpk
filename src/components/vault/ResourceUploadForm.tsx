"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { uploadCourseResource } from "@/lib/vault/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function ResourceUploadForm({ classRow }: { classRow: ClassRow }) {
  const t = useTranslations("vault");
  const [state, action, pending] = useActionState(uploadCourseResource, undefined);

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="glass-surface flex flex-wrap items-end gap-3 rounded-2xl px-5 py-4"
    >
      <input type="hidden" name="classId" value={classRow.id} />
      <input type="hidden" name="className" value={classRow.name} />

      <input
        name="subject"
        placeholder={t("subject")}
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
      />
      <input type="file" name="file" required className="text-sm" />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? t("uploading") : t("addToVault")}
      </button>
      {state?.message && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && (
        <p className="w-full text-sm text-green-600 dark:text-green-400">{state.success}</p>
      )}
    </form>
  );
}
