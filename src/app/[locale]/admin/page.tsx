import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/admin/StatCard";
import { getDashboardStats } from "@/lib/admin/data";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, stats] = await Promise.all([getTranslations("admin"), getDashboardStats()]);

  const cards = [
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
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={t("statTotalUsers")} value={stats.totalUsers} icon="👥" accent="blue" />
        <StatCard label={t("statOnline")} value={stats.onlineUsers} icon="🟢" accent="green" />
        <StatCard label={t("statOffline")} value={stats.offlineUsers} icon="⚪" accent="slate" />
        <StatCard label={t("statPendingAccounts")} value={stats.pendingAccounts} icon="⏳" accent="amber" />
        <StatCard label={t("statPendingHelp")} value={stats.pendingHelp} icon="🆘" accent="rose" />
        <StatCard
          label={t("statPendingSuggestions")}
          value={stats.pendingSuggestions}
          icon="💡"
          accent="violet"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{t("shortcuts")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="glass-surface rounded-3xl px-6 py-10 text-center font-semibold transition hover:shadow-lg"
            >
              {card.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
