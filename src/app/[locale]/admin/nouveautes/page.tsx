import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ReleaseForm from "@/components/admin/ReleaseForm";
import { listReleases } from "@/lib/admin/data";

export default async function AdminReleasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, releases] = await Promise.all([getTranslations("admin"), listReleases()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("releasesTab")} />
      <ReleaseForm />
      {releases.length === 0 ? (
        <EmptyState message="Aucune publication pour le moment." />
      ) : (
        <div className="flex flex-col gap-3">
          {releases.map((r) => (
            <div key={r.id} className="glass-surface rounded-2xl px-5 py-4">
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-foreground/70">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
