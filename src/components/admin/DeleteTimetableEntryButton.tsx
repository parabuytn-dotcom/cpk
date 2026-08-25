"use client";

import { useTransition } from "react";
import { deleteTimetableEntry } from "@/lib/admin/actions";

export default function DeleteTimetableEntryButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Supprimer ce créneau ?")) {
          startTransition(() => deleteTimetableEntry(entryId));
        }
      }}
      disabled={isPending}
      aria-label="Supprimer le créneau"
      className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      🗑
    </button>
  );
}
