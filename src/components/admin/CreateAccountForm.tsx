"use client";

import { useActionState, useState } from "react";
import { createAccount } from "@/lib/admin/actions";

export default function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccount, undefined);
  const [role, setRole] = useState<"parent" | "teacher">("parent");

  return (
    <form action={action} className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRole("parent")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            role === "parent"
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Parent
        </button>
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            role === "teacher"
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          Professeur
        </button>
      </div>
      <input type="hidden" name="role" value={role} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="fullName"
          placeholder="Nom et prénom"
          required
          className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
        />
        <input
          name="phone"
          placeholder="Téléphone (8 chiffres)"
          required
          className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
        />
        {role === "teacher" && (
          <input
            name="subject"
            placeholder="Matière"
            className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm sm:col-span-2 dark:border-white/10 dark:bg-white/5"
          />
        )}
        <input
          name="password"
          placeholder="Mot de passe (6 caractères min.)"
          required
          minLength={6}
          className="rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm sm:col-span-2 dark:border-white/10 dark:bg-white/5"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Création…" : "Créer le compte"}
      </button>

      {state?.message && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}
      {state?.success && <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>}
    </form>
  );
}
