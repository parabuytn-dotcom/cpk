"use client";

import { useActionState, useState } from "react";
import { createGroup } from "@/lib/groups/actions";

export default function CreateGroupForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createGroup, undefined);

  if (state?.success) {
    return (
      <div className="glass-surface rounded-3xl p-6 text-center text-green-700 dark:text-green-400">
        {state.success}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-surface w-full rounded-3xl px-6 py-5 text-center font-semibold transition hover:shadow-lg"
      >
        + Créer un groupe
      </button>
    );
  }

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      <input
        name="name"
        placeholder="Nom du groupe (ex: Projet SVT — Écosystèmes)"
        required
        autoFocus
        className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
      />
      {state?.errors?.name?.map((err) => (
        <p key={err} className="text-xs text-red-600 dark:text-red-400">
          {err}
        </p>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer"}
      </button>
      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
    </form>
  );
}
