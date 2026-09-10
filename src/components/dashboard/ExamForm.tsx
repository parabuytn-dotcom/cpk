"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createExam } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function ExamForm({ classes }: { classes: ClassRow[] }) {
  const t = useTranslations("exams");
  const [state, action, pending] = useActionState(createExam, undefined);

  return (
    <form action={action} className="glass-surface grid gap-3 rounded-3xl p-6 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{t("addTitle")}</h2>

      <select
        name="classId"
        required
        onChange={(e) => {
          const select = e.target;
          const hiddenInput = select.form?.elements.namedItem("className") as HTMLInputElement;
          if (hiddenInput) hiddenInput.value = select.options[select.selectedIndex].text;
        }}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      >
        <option value="">{t("classPlaceholder")}</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input type="hidden" name="className" />

      <input
        name="subject"
        placeholder={t("subject")}
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />

      <select
        name="type"
        defaultValue="controle"
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      >
        <option value="controle">{t("typeControle")}</option>
        <option value="synthese">{t("typeSynthese")}</option>
      </select>
      <input
        type="date"
        name="examDate"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />

      <textarea
        name="description"
        placeholder={t("descriptionPlaceholder")}
        rows={2}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 sm:col-span-2 dark:border-white/10 dark:bg-white/5"
      />
      <textarea
        name="teacherNotes"
        placeholder={t("notesPlaceholder")}
        rows={2}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 sm:col-span-2 dark:border-white/10 dark:bg-white/5"
      />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? t("adding") : t("add")}
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
