import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import StatsBarChart from "@/components/admin/StatsBarChart";
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
    { href: "/admin/dons", label: t("donationsTab") },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} />

      <div className="rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-gray-900">
        <StatsBarChart
          bars={[
            { label: t("statTotalUsers"), value: stats.totalUsers },
            { label: t("statOnline"), value: stats.onlineUsers },
            { label: t("statOffline"), value: stats.offlineUsers },
            { label: t("statPendingAccounts"), value: stats.pendingAccounts },
            { label: t("statPendingHelp"), value: stats.pendingHelp },
            { label: t("statPendingSuggestions"), value: stats.pendingSuggestions },
          ]}
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
