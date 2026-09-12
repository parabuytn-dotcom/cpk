"use client";

import { useActionState, useState } from "react";
import { updateAbsenceEmailSetting } from "@/lib/admin/actions";

export default function AbsenceEmailToggleForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [state, action, pending] = useActionState(updateAbsenceEmailSetting, undefined);
  const [enabled, setEnabled] = useState(initialEnabled);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="text-sm font-medium">Email lors d&apos;une absence de professeur</p>
        <p className="mt-1 text-xs text-foreground/50">
          En plus du SMS et de la notification, envoie un email aux parents et aux élèves concernés
          quand une absence est déclarée. Les envois apparaissent dans l&apos;onglet Emails.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEnabled(false)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !enabled
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Désactivé
        </button>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            enabled
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Activé
        </button>
      </div>
      <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
