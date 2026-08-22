import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  getConversationMeta,
  listMessages,
  listConversationMembers,
} from "@/lib/messaging/data";
import { markConversationRead } from "@/lib/messaging/actions";
import PageHeader from "@/components/ui/PageHeader";
import ChatThread from "@/components/messaging/ChatThread";
import MemberList from "@/components/messaging/MemberList";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  const meta = await getConversationMeta(id, profile);
  if (!meta) notFound();

  await markConversationRead(id);

  const [messages, members] = await Promise.all([
    listMessages(id),
    listConversationMembers(id, profile.id),
  ]);

  const participantNames = Object.fromEntries(members.map((m) => [m.id, m.name]));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link href="/messages" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← Messages
      </Link>
      <PageHeader title={meta.type === "class_group" ? `👥 ${meta.title}` : meta.title} />

      {meta.type === "class_group" && members.length > 0 && (
        <MemberList members={members} />
      )}

      <ChatThread
        conversationId={id}
        currentUserId={profile.id}
        initialMessages={messages}
        participantNames={participantNames}
      />
    </div>
  );
}
