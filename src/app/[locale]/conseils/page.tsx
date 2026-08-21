import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function TipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tips");

  // TODO: fetch `tips` posted by validated alumni/top students (Phase 4).
  return (
    <div>
      <PageHeader title={t("title")} />
      <EmptyState message={t("empty")} />
    </div>
  );
}
