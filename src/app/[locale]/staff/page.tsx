import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staff");

  // TODO: fetch staff_members from Supabase Storage/DB and render photo cards
  // with a profession-centered fallback design when no photo is provided (Phase 4).
  return (
    <div>
      <PageHeader title={t("title")} />
      <EmptyState message={t("empty")} />
    </div>
  );
}
