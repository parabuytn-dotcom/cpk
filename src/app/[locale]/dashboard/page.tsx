import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  listChildrenForParent,
  listClassesForTeacher,
  listHomeworkForTeacher,
  listHomeworkForClass,
  getStudentClassInfo,
} from "@/lib/admin/data";
import PageHeader from "@/components/ui/PageHeader";
import ChildAccountButton from "@/components/dashboard/ChildAccountButton";
import ResetChildPasswordButton from "@/components/dashboard/ResetChildPasswordButton";
import ProfileProgress from "@/components/dashboard/ProfileProgress";
import EditProfileForm from "@/components/dashboard/EditProfileForm";
import HomeworkForm from "@/components/dashboard/HomeworkForm";
import TeacherAbsenceForm from "@/components/dashboard/TeacherAbsenceForm";
import HomeworkChecklist from "@/components/dashboard/HomeworkChecklist";
import BadgesRow from "@/components/dashboard/BadgesRow";
import AvatarUpload from "@/components/dashboard/AvatarUpload";
import EmptyState from "@/components/ui/EmptyState";
import { listMyBadges } from "@/lib/badges/data";
import { formatDate } from "@/lib/formatDate";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  const t = await getTranslations("dashboard");
  const [children, myBadges] = await Promise.all([
    profile.role === "parent" ? listChildrenForParent(profile.id) : Promise.resolve([]),
    listMyBadges(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <div className="glass-surface flex items-center justify-between gap-4 rounded-3xl px-6 py-6">
        <p className="text-foreground/70">
          {profile.fullName ??
            (profile.parentFirstName
              ? `${profile.parentFirstName} ${profile.parentLastName ?? ""}`.trim()
              : profile.role)}
        </p>
        <AvatarUpload
          userId={profile.id}
          name={profile.fullName ?? profile.parentFirstName ?? profile.role}
          avatarUrl={profile.avatarUrl}
        />
      </div>

      <BadgesRow badges={myBadges} />

      <ProfileProgress profile={profile} />
      <EditProfileForm profile={profile} />

      {profile.role === "parent" && profile.status === "validated" && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t("myChildren")}</h2>
          {children.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("noChildren")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      {child.firstName} {child.lastName ?? ""}
                    </p>
                    <p className="text-sm text-foreground/60">{child.className}</p>
                  </div>
                  {child.hasAccount ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
                        {t("accountExists")}
                      </span>
                      <ResetChildPasswordButton studentId={child.id} />
                    </div>
                  ) : (
                    <ChildAccountButton studentId={child.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {profile.role === "teacher" && <TeacherDashboard profileId={profile.id} locale={locale} />}

      {profile.role === "student" && <StudentDashboard profileId={profile.id} />}
    </div>
  );
}

async function TeacherDashboard({ profileId, locale }: { profileId: string; locale: string }) {
  const [t, classes, homework] = await Promise.all([
    getTranslations("homework"),
    listClassesForTeacher(profileId),
    listHomeworkForTeacher(profileId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("title")}</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("noClassesAssigned")}</p>
        ) : (
          <HomeworkForm classes={classes} />
        )}
      </div>

      {homework.length > 0 && (
        <div className="flex flex-col gap-2">
          {homework.map((h) => (
            <div key={h.id} className="glass-surface rounded-2xl px-5 py-3">
              <p className="font-semibold">
                {h.className} · {h.subject}
              </p>
              <p className="text-sm text-foreground/60">
                {h.description} — {t("dueFor")} {formatDate(locale, h.dueDate)}
              </p>
            </div>
          ))}
        </div>
      )}

      <TeacherAbsenceForm />
    </div>
  );
}

async function StudentDashboard({ profileId }: { profileId: string }) {
  const [t, classInfo] = await Promise.all([
    getTranslations("homework"),
    getStudentClassInfo(profileId),
  ]);
  const homework = classInfo
    ? await listHomeworkForClass(classInfo.classId, classInfo.className, profileId)
    : [];

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{t("myHomework")}</h2>
      {homework.length === 0 ? (
        <EmptyState message={t("noHomework")} />
      ) : (
        <HomeworkChecklist items={homework} />
      )}
    </div>
  );
}
