import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Avatar from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import { listUserReports } from "@/lib/admin/data";
import ReportStatusButtons from "@/components/admin/ReportStatusButtons";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, reports] = await Promise.all([getTranslations("admin"), listUserReports()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("reportsTab")} />

      {reports.length === 0 ? (
        <EmptyState message={t("reportsEmpty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <div key={report.id} className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={report.reportedName} photoUrl={report.reportedAvatarUrl} size={40} />
                  <div>
                    <Link
                      href={`/admin/utilisateurs/${report.reportedId}`}
                      className="font-semibold hover:underline"
                    >
                      {report.reportedName}
                    </Link>
                    <p className="text-xs text-foreground/60">
                      signalé par {report.reporterName} ·{" "}
                      {new Date(report.createdAt).toLocaleString("fr-FR")}
                      {report.context ? ` · ${report.context}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    report.status === "open"
                      ? "bg-accent-500/15 text-accent-600 dark:text-accent-400"
                      : "bg-black/5 text-foreground/60 dark:bg-white/10"
                  }`}
                >
                  {report.status}
                </span>
              </div>

              <p className="rounded-2xl bg-black/5 px-4 py-3 text-sm dark:bg-white/5">
                {report.reason}
              </p>

              {report.status === "open" && <ReportStatusButtons reportId={report.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
