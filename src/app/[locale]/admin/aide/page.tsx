import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import HelpRequestRowItem from "@/components/admin/HelpRequestRow";
import { listHelpRequests } from "@/lib/admin/data";

export default async function AdminHelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, requests] = await Promise.all([getTranslations("admin"), listHelpRequests()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("helpTab")} />
      {requests.length === 0 ? (
        <EmptyState message={t("helpEmpty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <HelpRequestRowItem key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
