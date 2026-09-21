"use client";

import { useActionState } from "react";
import { updateSiteSetting } from "@/lib/admin/actions";

/** The Monday that starts week A — everything fortnightly alternates from it. */
export default function WeekAStartForm({ initialValue }: { initialValue: string }) {
  const [state, action, pending] = useActionState(updateSiteSetting, undefined);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <input type="hidden" name="key" value="week_a_start" />
      <div>
        <p className="text-sm font-medium">Lundi de référence de la semaine A</p>
        <p className="mt-1 text-xs text-foreground/50">
          Pour les cours à la quinzaine. Choisis un lundi qui était (ou sera) une semaine A : le site alterne ensuite
          tout seul, semaine après semaine.
        </p>
      </div>
      <input
        name="value"
        type="date"
        defaultValue={initialValue}
        className="w-48 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
      />
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
