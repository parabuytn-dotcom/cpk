"use client";

import { useState, useTransition } from "react";
import { deleteUserProfile } from "@/lib/admin/actions";

export default function DeleteUserButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Supprimer définitivement ce compte ? Cette action est irréversible.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUserProfile(userId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
      >
        {isPending ? "…" : "Supprimer"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
