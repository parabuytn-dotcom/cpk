import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getSuggestionDetail, getMyVote } from "@/lib/suggestions/data";
import Avatar from "@/components/ui/Avatar";
import SuggestionVoteButton from "@/components/suggestions/SuggestionVoteButton";
import { formatDate } from "@/lib/formatDate";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [t, suggestion] = await Promise.all([
    getTranslations("suggestions"),
    getSuggestionDetail(id),
  ]);

  if (!suggestion) notFound();

  const myVote = await getMyVote(profile.id);

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/idees" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← {t("title")}
      </Link>

      <div className="glass-surface mt-4 flex flex-col gap-4 rounded-3xl p-6">
        <h1 className="text-2xl font-bold">{suggestion.title ?? t("untitled")}</h1>

        <div className="flex items-center gap-3">
          <Avatar name={suggestion.authorName} photoUrl={suggestion.authorAvatarUrl} size={40} />
          <div>
            <p className="font-medium">{suggestion.authorName}</p>
            <p className="text-xs text-foreground/50">{formatDate(locale, suggestion.createdAt)}</p>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-foreground/85">{suggestion.content}</p>

        <SuggestionVoteButton
          suggestionId={suggestion.id}
          initialVotes={suggestion.votes}
          initialIsMine={myVote === suggestion.id}
          wonAt={suggestion.wonAt}
        />
      </div>
    </div>
  );
}
