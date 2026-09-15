"use client";

import { useTransition } from "react";
import { cancelUrgent } from "@/lib/admin/urgentActions";

export default function CancelUrgentButton({ broadcastId, remaining }: { broadcastId: string; remaining: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm(`Annuler les ${remaining} envoi(s) restant(s) ? Ce qui est déjà parti reste envoyé.`)) {
          startTransition(() => cancelUrgent(broadcastId));
        }
      }}
      className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
    >
      {isPending ? "Annulation…" : `Annuler les ${remaining} envoi(s) restant(s)`}
    </button>
  );
}
