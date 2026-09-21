import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ClassSelector from "@/components/admin/ClassSelector";
import TimetableGrid from "@/components/admin/TimetableGrid";
import { getCurrentProfile } from "@/lib/auth/session";
import { isFullAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listClasses, listTimetableEntries, listMakeupSessionsForClass } from "@/lib/admin/data";
import { getCurrentWeekParity, getMyClassGroups } from "@/lib/timetable/weeks";
import MakeupSessionsList from "@/components/dashboard/MakeupSessionsList";

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

export default async function TimetablePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ classId?: string; semaine?: string; tous?: string }>;
}) {
  const { locale } = await params;
  const { classId: requestedClassId, semaine, tous } = await searchParams;
  setRequestLocale(locale);

  const [t, profile, classes, week] = await Promise.all([
    getTranslations("timetable"),
    getCurrentProfile(),
    listClasses(),
    getCurrentWeekParity(),
  ]);

  const classId = requestedClassId || (await getDefaultClassId(profile));
  const selectedClass = classes.find((c) => c.id === classId);
  const [allEntries, makeupSessions, myGroups] = selectedClass
    ? await Promise.all([
        listTimetableEntries(selectedClass.id),
        listMakeupSessionsForClass(selectedClass.id),
        profile ? getMyClassGroups(profile.id) : Promise.resolve([]),
      ])
    : [[], [], []];

  const canManageMakeupSessions = profile?.role === "teacher" || isFullAdmin(profile?.role);

  // Which of the two weeks is on screen: the current one by default.
  const shownWeek = semaine === "A" || semaine === "B" ? semaine : week.parity;
  // A pupil only sees their own half-group's lessons; staff see everything.
  const seesEverything =
    !profile || isFullAdmin(profile.role) || profile.role === "teacher" || profile.role === "staff";
  const showAllGroups = tous === "1" || seesEverything;

  const entries = allEntries.filter((entry) => {
    if (entry.weekParity !== "all" && entry.weekParity !== shownWeek) return false;
    if (!showAllGroups && entry.groupId && !myGroups.includes(entry.groupId)) return false;
    return true;
  });

  const hasFortnightly = allEntries.some((entry) => entry.weekParity !== "all");
  const hasGroups = allEntries.some((entry) => entry.groupId);
  const linkFor = (next: Record<string, string>) => {
    const search = new URLSearchParams({
      ...(selectedClass ? { classId: selectedClass.id } : {}),
      ...(semaine ? { semaine } : {}),
      ...(tous ? { tous } : {}),
      ...next,
    });
    return `/emploi-du-temps?${search.toString()}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} />

      <div className="flex flex-wrap items-center gap-3">
        <ClassSelector classes={classes} currentClassId={selectedClass?.id} label={t("selectClass")} />

        {hasFortnightly &&
          (["A", "B"] as const).map((parity) => (
            <Link
              key={parity}
              href={linkFor({ semaine: parity })}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                shownWeek === parity
                  ? "bg-brand-600 text-white shadow-md"
                  : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10"
              }`}
            >
              Semaine {parity}
              {week.configured && week.parity === parity ? " (cette semaine)" : ""}
            </Link>
          ))}

        {hasGroups && !seesEverything && (
          <Link
            href={linkFor({ tous: tous === "1" ? "0" : "1" })}
            className="rounded-full bg-black/5 px-4 py-2 text-sm font-medium transition hover:bg-black/10 dark:bg-white/10"
          >
            {tous === "1" ? "Voir seulement mes groupes" : "Voir tous les groupes"}
          </Link>
        )}
      </div>

      {hasFortnightly && !week.configured && (
        <p className="glass-surface rounded-2xl px-5 py-3 text-sm text-foreground/70">
          Cette classe a des cours à la quinzaine. Indique dans <b>Admin → Emploi du temps</b> le lundi de référence de
          la semaine A pour que le site sache quelle semaine on est.
        </p>
      )}

      {selectedClass ? <TimetableGrid entries={entries} /> : <EmptyState message={t("empty")} />}

      {selectedClass && (
        <MakeupSessionsList sessions={makeupSessions} locale={locale} canDelete={canManageMakeupSessions} />
      )}
    </div>
  );
}
