import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import AbsenceForm from "@/components/admin/AbsenceForm";
import { listTeachers, listTeacherAbsences } from "@/lib/admin/data";

export default async function AdminAbsencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, teachers, absences] = await Promise.all([
    getTranslations("admin"),
    listTeachers(),
    listTeacherAbsences(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("absencesTab")} />

      <AbsenceForm teachers={teachers} />

      {absences.length === 0 ? (
        <EmptyState message={t("absencesEmpty")} />
      ) : (
        <div className="glass-surface flex flex-col divide-y divide-black/5 rounded-3xl px-5 dark:divide-white/10">
          {absences.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-medium">{a.teacherName}</span>
              <span className="text-sm text-foreground/60">
                {new Date(a.startsAt).toLocaleString("fr-FR")} →{" "}
                {new Date(a.endsAt).toLocaleString("fr-FR")}
              </span>
              {a.reason && <span className="text-sm text-foreground/60">{a.reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
