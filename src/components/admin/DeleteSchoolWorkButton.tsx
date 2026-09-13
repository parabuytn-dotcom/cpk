"use client";

import { useTransition } from "react";
import { deleteExam, deleteHomework } from "@/lib/admin/actions";

export default function DeleteSchoolWorkButton({ kind, id }: { kind: "homework" | "exam"; id: string }) {
  const [isPending, startTransition] = useTransition();
  const label = kind === "homework" ? "ce devoir" : "ce devoir surveillé";

  return (
    <button
      type="button"
      onClick={() => {
        if (confirm(`Supprimer ${label} ? Il disparaîtra pour les élèves et les parents.`)) {
          startTransition(() => (kind === "homework" ? deleteHomework(id) : deleteExam(id)));
        }
      }}
      disabled={isPending}
      aria-label={`Supprimer ${label}`}
      className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      🗑
    </button>
  );
}
