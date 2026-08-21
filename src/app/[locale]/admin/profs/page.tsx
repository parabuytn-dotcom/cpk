import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import TeacherAccountButton from "@/components/admin/TeacherAccountButton";
import { listTeachers } from "@/lib/admin/data";

export default async function AdminTeachersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, teachers] = await Promise.all([getTranslations("admin"), listTeachers()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("teachersTab")} subtitle={t("teachersSubtitle")} />

      {teachers.length === 0 ? (
        <EmptyState message={t("teachersEmpty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
            >
              <div>
                <p className="font-semibold">
                  {teacher.firstName} {teacher.lastName}
                </p>
                <p className="text-sm text-foreground/60">
                  {teacher.subject ?? "—"} {teacher.phone ? `· ${teacher.phone}` : ""}
                </p>
              </div>
              {teacher.hasAccount ? (
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
                  {t("accountExists")}
                </span>
              ) : (
                <TeacherAccountButton teacherId={teacher.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
