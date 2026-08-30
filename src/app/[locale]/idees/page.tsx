import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listValidatedSuggestions, getMyVote } from "@/lib/suggestions/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SuggestionComposer from "@/components/suggestions/SuggestionComposer";
import SuggestionVoteList from "@/components/suggestions/SuggestionVoteList";

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

  const [t, suggestions, myVote] = await Promise.all([
    getTranslations("suggestions"),
    listValidatedSuggestions(),
    getMyVote(profile.id),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <SuggestionComposer />

      {suggestions.length === 0 ? (
        <EmptyState message={t("empty")} />
      ) : (
        <>
          <p className="text-xs text-foreground/50">{t("voteHint")}</p>
          <SuggestionVoteList suggestions={suggestions} initialMyVote={myVote} locale={locale} />
        </>
      )}
    </div>
  );
}
