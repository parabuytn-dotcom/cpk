"use client";

import { useActionState } from "react";
import { loginWithQrToken } from "@/lib/auth/actions";

export default function QrPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(loginWithQrToken, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="mb-1 block text-sm font-medium">Mot de passe</label>
        <input
          name="password"
          type="password"
          required
          autoFocus
          className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "…" : "Se connecter"}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
    </form>
  );
}
