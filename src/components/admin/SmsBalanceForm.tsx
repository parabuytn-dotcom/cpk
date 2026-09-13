"use client";

import { useActionState, useState } from "react";
import { adjustSmsBalance } from "@/lib/admin/quotaActions";

export default function SmsBalanceForm({ hasBalance }: { hasBalance: boolean }) {
  const [state, action, pending] = useActionState(adjustSmsBalance, undefined);
  const [mode, setMode] = useState<"add" | "set">(hasBalance ? "add" : "set");

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="mode" value={mode} />
      <div className="flex gap-2">
        {(
          [
            ["add", "Ajouter des SMS"],
            ["set", "Corriger le solde"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === value
                ? "bg-brand-600 text-white shadow-md"
                : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          name="amount"
          type="number"
          min={0}
          step={1}
          required
          placeholder={mode === "add" ? "Ex. 500" : "Solde affiché par l'opérateur"}
          className="w-56 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : mode === "add" ? "Ajouter" : "Enregistrer"}
        </button>
      </div>

      <p className="text-xs text-foreground/50">
        {mode === "add"
          ? "S'ajoute à ce qui reste — à utiliser après une recharge du forfait."
          : "Remplace le solde par la valeur exacte donnée par l'opérateur (ex. en composant le code de consultation du solde)."}
      </p>

      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
