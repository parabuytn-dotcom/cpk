"use client";

import { useActionState } from "react";
import { declareOwnAbsence } from "@/lib/admin/actions";

export default function TeacherAbsenceForm() {
  const [state, action, pending] = useActionState(declareOwnAbsence, undefined);

  return (
    <form action={action} className="glass-surface grid gap-3 rounded-3xl p-6 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Je suis absent(e)</h2>
      <label className="text-sm">
        Début
        <input
          type="datetime-local"
          name="startsAt"
          required
          className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
        />
      </label>
      <label className="text-sm">
        Fin
        <input
          type="datetime-local"
          name="endsAt"
          required
          className="mt-1 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
        />
      </label>
      <input
        name="reason"
        placeholder="Motif (optionnel)"
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 sm:col-span-2 dark:border-white/10 dark:bg-white/5"
      />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60 sm:col-span-2"
      >
        Déclarer mon absence
      </button>
      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600 dark:text-green-400 sm:col-span-2">{state.success}</p>
      )}
    </form>
  );
}
