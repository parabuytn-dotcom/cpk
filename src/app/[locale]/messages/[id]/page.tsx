import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getConversation } from "@/lib/messages/data";
import ConversationView from "@/components/messages/ConversationView";

export const dynamic = "force-dynamic";

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

  const conversation = await getConversation(profile.id, id);
  if (!conversation) notFound();

  return (
    <ConversationView
      conversation={conversation}
      currentUserId={profile.id}
      currentUserName={profile.fullName ?? "Moi"}
      locale={locale}
    />
  );
}
