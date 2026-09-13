import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { countUnreadInbox } from "@/lib/admin/data";
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

  const [t, unread] = await Promise.all([getTranslations("admin"), countUnreadInbox()]);
  const tabs: { href: string; label: string; badge?: number }[] = [
    { href: "/admin/comptes", label: t("accounts") },
    { href: "/admin/documents", label: t("documentsTab") },
    { href: "/admin/utilisateurs", label: t("usersTab") },
    { href: "/admin/classes", label: t("classesTab") },
    { href: "/admin/emploi-du-temps", label: t("timetableTab") },
    { href: "/admin/absences", label: t("absencesTab") },
    { href: "/admin/profs", label: t("teachersTab") },
    { href: "/admin/staff", label: t("staffTab") },
    { href: "/admin/boite-de-reception", label: t("inboxTab"), badge: unread.total },
    { href: "/admin/signalements", label: t("reportsTab") },
    { href: "/admin/emails", label: t("emailsTab") },
    { href: "/admin/sms", label: t("smsTab") },
    { href: "/admin/idees", label: t("ideasTab") },
    { href: "/admin/nouveautes", label: t("releasesTab") },
    { href: "/admin/notifications", label: t("notificationsTab") },
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
            className="glass-surface flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-brand-500/10"
          >
            {tab.label}
            {tab.badge ? (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
