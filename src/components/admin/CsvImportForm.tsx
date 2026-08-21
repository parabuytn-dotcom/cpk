"use client";

import { useActionState } from "react";
import { importTimetableCsv } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function CsvImportForm({ classRow }: { classRow: ClassRow }) {
  const [state, action, pending] = useActionState(importTimetableCsv, undefined);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      <input type="hidden" name="classId" value={classRow.id} />
      <input type="hidden" name="className" value={classRow.name} />
      <label className="text-sm font-medium">
        CSV (colonnes : Jour, Heure_Début, Heure_Fin, Matière, Professeur — Jour en chiffre, 1=Lundi)
      </label>
      <textarea
        name="csvText"
        rows={6}
        placeholder={"Jour,Heure_Début,Heure_Fin,Matière,Professeur\n1,08:00,09:00,Mathématiques,Ali Ben Salah"}
        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        Importer
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
