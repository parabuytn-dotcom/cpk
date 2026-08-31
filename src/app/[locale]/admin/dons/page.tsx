import { getTranslations, setRequestLocale } from "next-intl/server";
import { listDonations } from "@/lib/admin/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

const STATUS_LABELS: Record<string, string> = {
  completed: "Confirmé",
  pending: "En attente",
  failed: "Échoué",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-emerald-600 dark:text-emerald-400",
  pending: "text-amber-600 dark:text-amber-400",
  failed: "text-red-600 dark:text-red-400",
};

export default async function AdminDonationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, donations] = await Promise.all([getTranslations("admin"), listDonations()]);

  const totalConfirmed = donations
    .filter((d) => d.status === "completed")
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("donationsTab")}
        subtitle={`${(totalConfirmed / 1000).toLocaleString("fr-FR")} DT collectés au total.`}
      />

      {donations.length === 0 ? (
        <EmptyState message={t("donationsEmpty")} />
      ) : (
        <div className="flex flex-col gap-2">
          {donations.map((d) => (
            <div
              key={d.id}
              className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-5 py-3"
            >
              <div>
                <p className="font-medium">{d.donorName}</p>
                <p className="text-xs text-foreground/50">{formatDateTime(locale, d.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">{(d.amount / 1000).toLocaleString("fr-FR")} DT</p>
                <p className={`text-xs font-medium ${STATUS_COLORS[d.status] ?? ""}`}>
                  {STATUS_LABELS[d.status] ?? d.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
