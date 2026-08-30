import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ClassSelector from "@/components/admin/ClassSelector";
import ExamCalendar from "@/components/exams/ExamCalendar";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listClasses, listExamsForClass } from "@/lib/admin/data";

async function getDefaultClassId(profile: Awaited<ReturnType<typeof getCurrentProfile>>) {
  if (!profile || (profile.role !== "student" && profile.role !== "parent")) return undefined;

  const supabase = await createClient();
  const query =
    profile.role === "student"
      ? supabase.from("students").select("class_id").eq("user_id", profile.id)
      : supabase.from("students").select("class_id").eq("parent_id", profile.id);

  const { data } = await query.order("created_at").limit(1).maybeSingle();
  return data?.class_id ?? undefined;
}

export default async function ExamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { locale } = await params;
  const { classId: requestedClassId } = await searchParams;
  setRequestLocale(locale);

  const [t, profile, classes] = await Promise.all([
    getTranslations("exams"),
    getCurrentProfile(),
    listClasses(),
  ]);

  const classId = requestedClassId || (await getDefaultClassId(profile));
  const selectedClass = classes.find((c) => c.id === classId);
  const exams = selectedClass ? await listExamsForClass(selectedClass.id) : [];

  return (
    <div>
      <PageHeader title={t("title")} />

      <div className="mb-6">
        <ClassSelector classes={classes} currentClassId={selectedClass?.id} label={t("selectClass")} />
      </div>

      {selectedClass ? (
        <ExamCalendar exams={exams} locale={locale} />
      ) : (
        <EmptyState message={t("empty")} />
      )}
    </div>
  );
}
