"use client";

import { useState, useTransition } from "react";
import { renameClass, deleteClass } from "@/lib/admin/actions";
import type { ClassRow } from "@/lib/admin/data";

export default function ClassEditRow({ classRow }: { classRow: ClassRow }) {
  const [name, setName] = useState(classRow.name);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="glass-surface flex flex-wrap items-center gap-3 rounded-2xl px-5 py-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      />
      <button
        onClick={() => startTransition(() => renameClass(classRow.id, name))}
        disabled={isPending || name === classRow.name}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50"
      >
        Renommer
      </button>
      <button
        onClick={() => {
          if (confirm(`Supprimer la classe "${classRow.name}" ?`)) {
            startTransition(() => deleteClass(classRow.id));
          }
        }}
        disabled={isPending}
        className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
      >
        Supprimer
      </button>
    </div>
  );
}
