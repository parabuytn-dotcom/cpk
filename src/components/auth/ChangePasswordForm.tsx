"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/auth/actions";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Confirme le mot de passe</label>
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "…" : "Valider"}
      </button>
      {state?.message && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}
