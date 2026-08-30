import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listValidatedSuggestions } from "@/lib/suggestions/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SuggestionComposer from "@/components/suggestions/SuggestionComposer";
import { formatDate } from "@/lib/formatDate";

export default async function IdeasPage({
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

  const [t, suggestions] = await Promise.all([
    getTranslations("suggestions"),
    listValidatedSuggestions(),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <SuggestionComposer />

      {suggestions.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/idees/${s.id}`}
              className="glass-surface flex items-center justify-between gap-4 rounded-2xl px-6 py-5 transition hover:shadow-lg"
            >
              <p className="text-lg font-semibold">{s.title}</p>
              <p className="shrink-0 text-xs text-foreground/50">{formatDate(locale, s.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
