import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listMyGroups } from "@/lib/groups/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CreateGroupForm from "@/components/groups/CreateGroupForm";

export default async function GroupsPage({
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

  const t = await getTranslations("groups");

  if (profile.role !== "student" && profile.role !== "admin") {
    return (
      <div className="mx-auto max-w-md text-center">
        <PageHeader title={t("title")} subtitle={t("studentsOnly")} />
      </div>
    );
  }

  const groups = await listMyGroups(profile.id);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <CreateGroupForm />

      {groups.length === 0 ? (
        <EmptyState message={t("noGroups")} />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groupes/${group.id}`}
              className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-6 py-5 transition hover:shadow-lg"
            >
              <div>
                <p className="text-lg font-semibold">{group.name}</p>
                <p className="text-sm text-foreground/60">{group.className}</p>
              </div>
              <span className="shrink-0 text-sm text-foreground/50">
                {t("memberCount", { count: group.memberCount })}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
