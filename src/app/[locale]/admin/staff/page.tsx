import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StaffForm from "@/components/admin/StaffForm";
import StaffRow from "@/components/admin/StaffRow";
import { listStaffMembers } from "@/lib/admin/data";

export default async function AdminStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, members] = await Promise.all([getTranslations("admin"), listStaffMembers()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("staffTab")} />
      <StaffForm />
      {members.length === 0 ? (
        <EmptyState message="Aucun membre du staff pour le moment." />
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <StaffRow key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}
