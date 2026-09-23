"use client";

import { useActionState, useRef, useState } from "react";
import { importTimetableCsv } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function CsvImportForm({ classRow }: { classRow: ClassRow }) {
  const [state, action, pending] = useActionState(importTimetableCsv, undefined);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);

  // Picking the file beats copying its text: a table copied off a screen has
  // no separators at all, and a paste from Excel arrives with tabs. This reads
  // the file as UTF-8 and drops it straight into the box, where it stays
  // editable.
  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (textarea.current) textarea.current.value = text;
    setLoadedFile(`${file.name} — ${text.trim().split(/\r?\n/).length} ligne(s)`);
  }

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      <input type="hidden" name="classId" value={classRow.id} />
      <input type="hidden" name="className" value={classRow.name} />
      <label className="text-sm font-medium">
        CSV — colonnes : Jour, Heure_Début, Heure_Fin, Matière, Salle, Professeur, Semaine, Groupe
        <span className="mt-1 block text-xs font-normal text-foreground/55">
          Jour en chiffre (1 = lundi). Salle et Professeur sont facultatifs. Semaine : vide pour toutes les semaines,
          sinon A ou B. Groupe : vide pour la classe entière, sinon le nom du demi-groupe (il est créé tout seul
          s&apos;il n&apos;existe pas).
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-full bg-black/5 px-4 py-2 text-sm font-medium transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20">
          Choisir un fichier…
          <input type="file" accept=".csv,text/csv,text/plain" onChange={loadFile} className="hidden" />
        </label>
        <span className="text-xs text-foreground/55">{loadedFile ?? "ou colle le texte ci-dessous"}</span>
      </div>

      <textarea
        ref={textarea}
        name="csvText"
        rows={6}
        placeholder={
          "Jour,Heure_Début,Heure_Fin,Matière,Salle,Professeur,Semaine,Groupe\n1,08:00,10:00,Maths,10,,,\n4,10:00,12:00,SVT,SN1,,B,Groupe 1"
        }
        className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 font-mono text-xs outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Import en cours…" : "Importer"}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
