"use client";

import { useTransition } from "react";
import { deleteTeacherAbsence } from "@/lib/admin/actions";

export default function DeleteAbsenceButton({ absenceId }: { absenceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Supprimer cette absence ? Les cours concernés redeviendront normaux.")) {
          startTransition(() => deleteTeacherAbsence(absenceId));
        }
      }}
      disabled={isPending}
      aria-label="Supprimer l'absence"
      className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      🗑
    </button>
  );
}
