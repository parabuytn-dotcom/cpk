import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listChildrenForParent } from "@/lib/admin/data";
import PageHeader from "@/components/ui/PageHeader";
import ChildAccountButton from "@/components/dashboard/ChildAccountButton";
import PhonePrompt from "@/components/dashboard/PhonePrompt";

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
  const children = profile.role === "parent" ? await listChildrenForParent(profile.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} />
      <div className="glass-surface rounded-3xl px-6 py-10 text-foreground/70">
        {profile.fullName ??
          (profile.parentFirstName
            ? `${profile.parentFirstName} ${profile.parentLastName ?? ""}`.trim()
            : profile.role)}
      </div>

      {!profile.phone && <PhonePrompt />}

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
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-700 dark:text-green-400">
                      {t("accountExists")}
                    </span>
                  ) : (
                    <ChildAccountButton studentId={child.id} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
