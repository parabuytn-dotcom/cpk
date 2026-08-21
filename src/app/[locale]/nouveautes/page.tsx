import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { listReleases } from "@/lib/admin/data";

export default async function ReleasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, releases] = await Promise.all([getTranslations("releases"), listReleases()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />
      {releases.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-4">
          {releases.map((r) => (
            <div key={r.id} className="glass-surface rounded-3xl px-6 py-6">
              <p className="text-xs text-foreground/50">
                {new Date(r.publishedAt).toLocaleDateString("fr-FR")}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{r.title}</h2>
              <p className="mt-2 text-foreground/75">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
