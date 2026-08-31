import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { Link } from "@/i18n/navigation";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect({ href: "/login", locale });
    return null;
  }

  const t = await getTranslations("admin");
  const tabs = [
    { href: "/admin/comptes", label: t("accounts") },
    { href: "/admin/documents", label: t("documentsTab") },
    { href: "/admin/utilisateurs", label: t("usersTab") },
    { href: "/admin/classes", label: t("classesTab") },
    { href: "/admin/emploi-du-temps", label: t("timetableTab") },
    { href: "/admin/absences", label: t("absencesTab") },
    { href: "/admin/profs", label: t("teachersTab") },
    { href: "/admin/staff", label: t("staffTab") },
    { href: "/admin/aide", label: t("helpTab") },
    { href: "/admin/idees", label: t("ideasTab") },
    { href: "/admin/nouveautes", label: t("releasesTab") },
    { href: "/admin/parametres", label: t("parametresTab") },
    { href: "/admin/dons", label: t("donationsTab") },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="glass-surface rounded-full px-4 py-2 text-sm font-medium transition hover:bg-brand-500/10"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
