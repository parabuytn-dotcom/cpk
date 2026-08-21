"use client";

import { useActionState } from "react";
import { updateUserProfile } from "@/lib/admin/actions";
import type { UserRow } from "@/lib/admin/data";

const ROLES = ["parent", "student", "teacher", "admin", "staff"];
const STATUSES = ["pending", "validated"];

export default function UserEditRow({ user }: { user: UserRow }) {
  const [state, action, pending] = useActionState(updateUserProfile, undefined);

  return (
    <form
      action={action}
      className="glass-surface grid gap-3 rounded-2xl px-5 py-4 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto]"
    >
      <input type="hidden" name="profileId" value={user.id} />

      <div>
        <p className="font-semibold">{user.fullName ?? "—"}</p>
        <p className="text-xs text-foreground/60">
          {user.cin ?? "—"} {user.className ? `· ${user.className}` : ""}
        </p>
      </div>

      <select
        name="role"
        defaultValue={user.role}
        className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <select
        name="status"
        defaultValue={user.status}
        className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        name="phone"
        defaultValue={user.phone ?? ""}
        placeholder="Téléphone"
        className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      />

      <input
        name="tags"
        defaultValue={user.tags.join(", ")}
        placeholder="tags (scribe, feed_publisher...)"
        className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "…" : "Sauver"}
      </button>

      {state?.message && (
        <p className="text-xs text-red-600 dark:text-red-400 sm:col-span-6">{state.message}</p>
      )}
      {state?.success && (
        <p className="text-xs text-green-600 dark:text-green-400 sm:col-span-6">{state.success}</p>
      )}
    </form>
  );
}
