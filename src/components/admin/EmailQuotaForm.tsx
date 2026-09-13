"use client";

import { useActionState } from "react";
import { updateEmailDailyLimit } from "@/lib/admin/quotaActions";

export default function EmailQuotaForm({ currentLimit }: { currentLimit: number }) {
  const [state, action, pending] = useActionState(updateEmailDailyLimit, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="text-sm font-medium" htmlFor="email-daily-limit">
        Limite quotidienne de la formule Brevo
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="email-daily-limit"
          name="limit"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={currentLimit}
          className="w-40 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <p className="text-xs text-foreground/50">
        300 sur la formule gratuite. À changer seulement si la formule Brevo change.
      </p>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
