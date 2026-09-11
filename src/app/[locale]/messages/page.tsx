import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listFriends } from "@/lib/messages/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

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

  const t = await getTranslations("messages");
  const friends = await listFriends(profile.id);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {friends.length === 0 ? (
        <EmptyState message={t("noFriends")} />
      ) : (
        <div className="flex flex-col gap-3">
          {friends.map((friend) => (
            <Link
              key={friend.userId}
              href={`/messages/${friend.userId}`}
              className="glass-surface flex items-center gap-4 rounded-2xl px-5 py-4 transition hover:shadow-lg"
            >
              <Avatar name={friend.name} photoUrl={friend.avatarUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{friend.name}</p>
                <p className="truncate text-sm text-foreground/60">
                  {friend.lastMessage ?? t("noMessagesYet")}
                </p>
              </div>
              {friend.unreadCount > 0 && (
                <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
                  {friend.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
