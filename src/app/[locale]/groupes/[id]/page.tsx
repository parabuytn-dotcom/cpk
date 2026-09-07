import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getGroupDetail } from "@/lib/groups/data";
import GroupRoom from "@/components/groups/GroupRoom";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
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

  const group = await getGroupDetail(id, profile.id);
  if (!group) notFound();

  const currentUserName = profile.fullName ?? profile.parentFirstName ?? "Élève";

  return (
    <GroupRoom
      group={group}
      currentUserId={profile.id}
      currentUserName={currentUserName}
      locale={locale}
    />
  );
}
