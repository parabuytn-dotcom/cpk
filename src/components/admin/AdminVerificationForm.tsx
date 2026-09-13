"use client";

import { useActionState, useState } from "react";
import { updateAdminVerificationSetting } from "@/lib/admin/adminVerificationActions";

export default function AdminVerificationForm({
  initialEnabled,
  initialPhone,
}: {
  initialEnabled: boolean;
  initialPhone: string;
}) {
  const [state, action, pending] = useActionState(updateAdminVerificationSetting, undefined);
  const [enabled, setEnabled] = useState(initialEnabled);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="text-sm font-medium">Vérification par SMS de l&apos;espace admin</p>
        <p className="mt-1 text-xs text-foreground/50">
          Quand elle est activée, ouvrir l&apos;espace admin demande, en plus du mot de passe, un code envoyé par SMS
          au numéro ci-dessous. Un code validé reste valable 12 heures sur cette session.
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            [false, "Désactivée"],
            [true, "Activée"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setEnabled(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              enabled === value
                ? "bg-brand-600 text-white shadow-md"
                : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Numéro qui reçoit le code</span>
        <input
          name="phone"
          type="tel"
          inputMode="numeric"
          maxLength={8}
          defaultValue={initialPhone}
          className="w-44 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </label>

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
