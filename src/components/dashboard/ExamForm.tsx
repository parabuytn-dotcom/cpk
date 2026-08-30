"use client";

import { useActionState } from "react";
import { createExam } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function ExamForm({ classes }: { classes: ClassRow[] }) {
  const [state, action, pending] = useActionState(createExam, undefined);

  return (
    <form action={action} className="glass-surface grid gap-3 rounded-3xl p-6 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Ajouter un devoir (contrôle/synthèse)</h2>

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
        <option value="">Classe…</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input type="hidden" name="className" />

      <input
        name="subject"
        placeholder="Matière"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />

      <select
        name="type"
        defaultValue="controle"
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      >
        <option value="controle">Devoir de contrôle</option>
        <option value="synthese">Devoir de synthèse</option>
      </select>
      <input
        type="date"
        name="examDate"
        required
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
      />

      <textarea
        name="description"
        placeholder="Sujet / cours couvert (facultatif)"
        rows={2}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 sm:col-span-2 dark:border-white/10 dark:bg-white/5"
      />
      <textarea
        name="teacherNotes"
        placeholder="Notes pour les élèves (facultatif)"
        rows={2}
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 sm:col-span-2 dark:border-white/10 dark:bg-white/5"
      />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "…" : "Ajouter le devoir"}
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
