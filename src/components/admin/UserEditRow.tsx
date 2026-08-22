"use client";

import { useActionState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { updateUserProfile } from "@/lib/admin/actions";
import { setUserBadge } from "@/lib/badges/actions";
import Avatar from "@/components/ui/Avatar";
import type { UserRow } from "@/lib/admin/data";
import type { BadgeRow } from "@/lib/badges/data";

const ROLES = ["parent", "student", "teacher", "admin", "staff"];
const STATUSES = ["pending", "validated"];

export default function UserEditRow({ user, badges }: { user: UserRow; badges: BadgeRow[] }) {
  const [state, action, pending] = useActionState(updateUserProfile, undefined);
  const [, startTransition] = useTransition();

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <form
        action={action}
        className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto]"
      >
        <input type="hidden" name="profileId" value={user.id} />

        <Link
          href={`/admin/utilisateurs/${user.id}`}
          className="flex items-center gap-2 hover:opacity-80"
        >
          <Avatar name={user.fullName ?? "?"} photoUrl={user.avatarUrl} size={36} />
          <div>
            <p className="font-semibold">{user.fullName ?? "—"}</p>
            <p className="text-xs text-foreground/60">
              {user.cin ?? "—"} {user.className ? `· ${user.className}` : ""}
            </p>
          </div>
        </Link>

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

      <div className="flex flex-wrap gap-2 border-t border-black/5 pt-3 text-xs dark:border-white/10">
        {badges.map((badge) => {
          const has = user.badgeIds.includes(badge.id);
          return (
            <label
              key={badge.id}
              className={`flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 transition ${
                has
                  ? "bg-brand-500/15 text-brand-700 dark:text-brand-300"
                  : "bg-black/5 text-foreground/50 dark:bg-white/5"
              }`}
              title={badge.description}
            >
              <input
                type="checkbox"
                checked={has}
                onChange={(e) => startTransition(() => setUserBadge(user.id, badge.id, e.target.checked))}
                className="h-3 w-3"
              />
              {badge.emoji} {badge.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
