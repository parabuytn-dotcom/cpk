import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import ClassSelector from "@/components/admin/ClassSelector";
import CsvImportForm from "@/components/admin/CsvImportForm";
import ManualEntryForm from "@/components/admin/ManualEntryForm";
import TimetableGrid from "@/components/admin/TimetableGrid";
import ClassGroupsManager from "@/components/admin/ClassGroupsManager";
import WeekAStartForm from "@/components/admin/WeekAStartForm";
import { getSiteSetting, listClasses, listTimetableEntries, listTeachers } from "@/lib/admin/data";
import { listClassGroups, listClassMembers } from "@/lib/admin/classGroupsData";

// Everything about the timetable in one place: the slots, the half-groups that
// split some of them, and the Monday the A/B fortnight counts from.
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

  const [t, classes, teachers, weekAStart] = await Promise.all([
    getTranslations("admin"),
    listClasses(),
    listTeachers(),
    getSiteSetting("week_a_start"),
  ]);
  const selectedClass = classes.find((c) => c.id === classId);

  const [entries, groups, pupils] = selectedClass
    ? await Promise.all([
        listTimetableEntries(selectedClass.id),
        listClassGroups(selectedClass.id),
        listClassMembers(selectedClass.id),
      ])
    : [[], [], []];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("timetableTab")} />

      <ClassSelector classes={classes} currentClassId={classId} label={t("selectClass")} />

      {classes.length === 0 && <p className="text-sm text-foreground/60">{t("noClasses")}</p>}

      {selectedClass && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <CsvImportForm classRow={selectedClass} />
            <ManualEntryForm classRow={selectedClass} teachers={teachers} groups={groups} />
          </div>

          <TimetableGrid entries={entries} canDelete />

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Cours par demi-groupe — {selectedClass.name}</h2>
            <ClassGroupsManager
              classId={selectedClass.id}
              className={selectedClass.name}
              groups={groups}
              pupils={pupils}
            />
          </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Quinzaine — semaines A et B</h2>
        <p className="text-sm text-foreground/60">
          Réglage commun à toutes les classes : à partir de ce lundi, le site alterne tout seul semaine A, semaine B.
        </p>
        <WeekAStartForm initialValue={weekAStart ?? ""} />
      </section>
    </div>
  );
}
