import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import UserEditRow from "@/components/admin/UserEditRow";
import { listAllProfiles } from "@/lib/admin/data";
import { listAllBadges } from "@/lib/badges/data";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, users, badges] = await Promise.all([
    getTranslations("admin"),
    listAllProfiles(),
    listAllBadges(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("usersTab")} subtitle={t("usersSubtitle")} />

      <div className="glass-surface rounded-2xl px-5 py-3 text-sm text-foreground/70">
        {t("usersPrivacyNote")}
      </div>

      {users.length === 0 ? (
        <EmptyState message={t("accountsEmpty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <UserEditRow key={user.id} user={user} badges={badges} />
          ))}
        </div>
      )}
    </div>
  );
}
