import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { listStaffMembers } from "@/lib/admin/data";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, members] = await Promise.all([getTranslations("staff"), listStaffMembers()]);

  return (
    <div>
      <PageHeader title={t("title")} />
      {members.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="glass-surface flex flex-col items-center gap-3 rounded-3xl px-6 py-8 text-center"
            >
              <Avatar name={m.fullName} photoUrl={m.showPhoto ? m.photoUrl : null} size={96} />
              <div>
                <p className="font-semibold">{m.fullName}</p>
                <p className="text-sm text-foreground/60">{m.roleTitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
