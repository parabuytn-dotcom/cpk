import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import SendNotificationForm from "@/components/admin/SendNotificationForm";
import { listAllProfiles, listClasses } from "@/lib/admin/data";
import { listNotificationsForUser } from "@/lib/notifications/data";
import { formatDateTime } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ user?: string }>;
}) {
  const { locale } = await params;
  const { user: selectedUserId } = await searchParams;
  setRequestLocale(locale);

  const [users, classes] = await Promise.all([listAllProfiles(), listClasses()]);
  const tags = [...new Set(users.flatMap((u) => u.tags))].sort();

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : undefined;
  const history = selectedUser ? await listNotificationsForUser(selectedUser.id) : [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Notifications"
        subtitle="Envoie un message à une personne, une classe, un rôle ou tout le monde — et consulte l'historique reçu par quelqu'un."
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Envoyer une notification
        </h2>
        <SendNotificationForm users={users} classes={classes} tags={tags} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Historique d&apos;une personne
        </h2>

        <form className="glass-surface flex flex-wrap items-center gap-3 rounded-3xl p-4">
          <select
            name="user"
            defaultValue={selectedUserId ?? ""}
            className="min-w-64 flex-1 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5"
          >
            <option value="">Choisir une personne…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName ?? "—"} · {u.role}
                {u.className ? ` · ${u.className}` : ""}
                {u.phone ? ` · ${u.phone}` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
          >
            Afficher
          </button>
        </form>

        {selectedUser && (
          <>
            <div className="glass-surface flex flex-wrap items-center gap-4 rounded-3xl p-5">
              <Avatar name={selectedUser.fullName ?? "?"} photoUrl={selectedUser.avatarUrl} size={48} />
              <div className="flex-1">
                <p className="font-semibold">{selectedUser.fullName ?? "—"}</p>
                <p className="text-sm text-foreground/60">
                  {selectedUser.role}
                  {selectedUser.className ? ` · ${selectedUser.className}` : ""}
                  {selectedUser.phone ? ` · ${selectedUser.phone}` : ""}
                </p>
              </div>
              <Link
                href={`/admin/utilisateurs/${selectedUser.id}`}
                className="text-sm text-brand-600 hover:underline dark:text-brand-400"
              >
                Voir la fiche →
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground/70">
                Envoyer à {selectedUser.fullName ?? "cette personne"}
              </h3>
              <SendNotificationForm
                users={users}
                classes={classes}
                tags={tags}
                lockedUserId={selectedUser.id}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground/70">
                Reçues ({history.length})
              </h3>
              {history.length === 0 ? (
                <p className="glass-surface rounded-2xl px-5 py-4 text-sm text-foreground/60">
                  Cette personne n&apos;a encore reçu aucune notification.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((n) => (
                    <div key={n.id} className="glass-surface rounded-2xl px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {n.title && <span className="font-semibold">{n.title}</span>}
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground/60 dark:bg-white/10">
                          {n.type}
                        </span>
                        {n.intrusive && (
                          <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                            intrusive
                          </span>
                        )}
                        {!n.read && (
                          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                            non lue
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{n.message}</p>
                      <p className="mt-1 text-xs text-foreground/40">
                        {formatDateTime(locale, n.createdAt)}
                        {n.link ? ` · ${n.link}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
