import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SuggestionReviewRow from "@/components/admin/SuggestionReviewRow";
import { listPendingSuggestions } from "@/lib/admin/data";

export default async function AdminIdeasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const suggestions = await listPendingSuggestions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Boîte à idées"
        subtitle="Propositions des parents et élèves en attente de validation."
      />
      {suggestions.length === 0 ? (
        <EmptyState message="Aucune proposition en attente." />
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionReviewRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  );
}
