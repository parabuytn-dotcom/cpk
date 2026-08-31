import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import ClassSelector from "@/components/admin/ClassSelector";
import CsvImportForm from "@/components/admin/CsvImportForm";
import ManualEntryForm from "@/components/admin/ManualEntryForm";
import TimetableGrid from "@/components/admin/TimetableGrid";
import { listClasses, listTimetableEntries, listTeachers } from "@/lib/admin/data";

export default async function AdminTimetablePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { locale } = await params;
  const { classId } = await searchParams;
  setRequestLocale(locale);

  const [t, classes, teachers] = await Promise.all([
    getTranslations("admin"),
    listClasses(),
    listTeachers(),
  ]);
  const selectedClass = classes.find((c) => c.id === classId);
  const entries = classId ? await listTimetableEntries(classId) : [];

  return (
    <div>
      <PageHeader title={t("timetableTab")} />

      <div className="mb-6">
        <ClassSelector classes={classes} currentClassId={classId} label={t("selectClass")} />
      </div>

      {classes.length === 0 && (
        <p className="mb-6 text-sm text-foreground/60">{t("noClasses")}</p>
      )}

      {selectedClass && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CsvImportForm classRow={selectedClass} />
            <ManualEntryForm classRow={selectedClass} teachers={teachers} />
          </div>
          <TimetableGrid entries={entries} canDelete />
        </div>
      )}
    </div>
  );
}
