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
  // Excludes only the caller here (not the other current group members) so
  // its length also tells us WHY the addable list might be empty: no
  // classmate has a linked student account yet, vs. every registered
  // classmate is already a member of this group — two very different
  // situations that need two different messages in the UI below.
  const registeredClassmates = ownClass
    ? await listClassmates(ownClass.classId, ownClass.className, [profile.id])
    : [];
  const memberIds = new Set(group.members.map((m) => m.userId));
  const classmates = registeredClassmates.filter((c) => !memberIds.has(c.userId));
  const noClassmatesRegisteredYet = registeredClassmates.length === 0;

  const currentUserName = profile.fullName ?? profile.parentFirstName ?? "Élève";

  return (
    <GroupRoom
      group={group}
      currentUserId={profile.id}
      currentUserName={currentUserName}
      classmates={classmates}
      noClassmatesRegisteredYet={noClassmatesRegisteredYet}
      locale={locale}
    />
  );
}
