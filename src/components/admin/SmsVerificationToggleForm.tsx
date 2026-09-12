"use client";

import { useActionState, useState } from "react";
import { updateSmsVerificationSetting } from "@/lib/admin/actions";

export default function SmsVerificationToggleForm({ initialEnabled }: { initialEnabled: boolean }) {
  const [state, action, pending] = useActionState(updateSmsVerificationSetting, undefined);
  const [enabled, setEnabled] = useState(initialEnabled);

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="text-sm font-medium">Vérification du numéro par SMS</p>
        <p className="mt-1 text-xs text-foreground/50">
          Quand c&apos;est activé, un code envoyé par SMS est exigé à l&apos;inscription et à chaque
          changement de numéro de téléphone dans un profil.
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
          Désactivée
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
          Activée
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
