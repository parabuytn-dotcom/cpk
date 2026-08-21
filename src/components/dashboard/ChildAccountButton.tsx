"use client";

import { useState, useTransition } from "react";
import { createChildAccount } from "@/lib/admin/actions";

export default function ChildAccountButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { success: true; email: string; password: string } | { success: false; error: string } | null
  >(null);

  function handleClick() {
    startTransition(async () => {
      const res = await createChildAccount(studentId);
      setResult(res);
    });
  }

  if (result?.success) {
    return (
      <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm">
        <p className="font-medium">Compte créé — note ces identifiants, ils ne seront plus affichés :</p>
        <p className="mt-1 font-mono">
          {result.email} / {result.password}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? "Création…" : "Créer le compte de mon enfant"}
      </button>
      {result?.success === false && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
    </div>
  );
}
