import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { reconcileClassGroupMemberships, listMyConversations } from "@/lib/messaging/data";
import { formatDateTime } from "@/lib/formatDate";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  await reconcileClassGroupMemberships(profile);
  const [t, conversations] = await Promise.all([
    getTranslations("messaging"),
    listMyConversations(profile),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} />

      {conversations.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="glass-surface flex items-center justify-between gap-3 rounded-2xl px-5 py-4 transition hover:bg-brand-500/5"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {c.type === "class_group" && <span aria-hidden>👥</span>}
                  {c.title}
                </p>
                <p className="truncate text-sm text-foreground/60">
                  {c.lastMessage ?? t("noMessagesYet")}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {c.lastMessageAt && (
                  <span className="text-xs text-foreground/40">
                    {formatDateTime(locale, c.lastMessageAt)}
                  </span>
                )}
                {c.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
