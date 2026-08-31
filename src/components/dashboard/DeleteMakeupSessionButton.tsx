"use client";

import { useTransition } from "react";
import { deleteMakeupSession } from "@/lib/admin/actions";

export default function DeleteMakeupSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Supprimer cette séance de rattrapage ?")) {
          startTransition(() => deleteMakeupSession(sessionId));
        }
      }}
      disabled={isPending}
      aria-label="Supprimer la séance"
      className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
    >
      🗑
    </button>
  );
}
