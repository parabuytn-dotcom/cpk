import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getGroupDetail, listClassmates, getOwnClass } from "@/lib/groups/data";
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

  const ownClass = await getOwnClass(profile.id);
  const classmates = ownClass
    ? await listClassmates(
        ownClass.classId,
        group.members.map((m) => m.userId),
      )
    : [];

  const currentUserName = profile.fullName ?? profile.parentFirstName ?? "Élève";

  return (
    <GroupRoom
      group={group}
      currentUserId={profile.id}
      currentUserName={currentUserName}
      classmates={classmates}
      locale={locale}
    />
  );
}
