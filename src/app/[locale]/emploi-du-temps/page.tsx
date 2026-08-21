import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function TimetablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("timetable");

  // TODO: fetch timetable_entries for the signed-in student's class from Supabase (Phase 2).
  // Cancelled slots (teacher_absences) should render strikethrough + greyed out with t("absent").
  return (
    <div>
      <PageHeader title={t("title")} />
      <EmptyState message={t("empty")} />
    </div>
  );
}
