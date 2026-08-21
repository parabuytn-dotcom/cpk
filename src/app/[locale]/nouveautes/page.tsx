import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function ReleasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("releases");

  // TODO: fetch `releases` published from the admin changelog editor (Phase 4).
  return (
    <div>
      <PageHeader title={t("title")} />
      <EmptyState message={t("empty")} />
    </div>
  );
}
