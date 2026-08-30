"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { voteForSuggestion, removeMyVote } from "@/lib/suggestions/actions";
import { formatDate } from "@/lib/formatDate";
import type { SuggestionSummary } from "@/lib/suggestions/data";

export default function SuggestionVoteList({
  suggestions,
  initialMyVote,
  locale,
}: {
  suggestions: SuggestionSummary[];
  initialMyVote: string | null;
  locale: string;
}) {
  const t = useTranslations("suggestions");
  const [myVote, setMyVote] = useState(initialMyVote);
  const [voteCounts, setVoteCounts] = useState(
    () => new Map(suggestions.map((s) => [s.id, s.votes])),
  );
  const [, startTransition] = useTransition();

  function handleVote(id: string) {
    const previous = myVote;
    if (previous === id) {
      setMyVote(null);
      setVoteCounts((counts) => {
        const next = new Map(counts);
        next.set(id, Math.max((next.get(id) ?? 1) - 1, 0));
        return next;
      });
      startTransition(() => removeMyVote());
      return;
    }

    setMyVote(id);
    setVoteCounts((counts) => {
      const next = new Map(counts);
      if (previous) next.set(previous, Math.max((next.get(previous) ?? 1) - 1, 0));
      next.set(id, (next.get(id) ?? 0) + 1);
      return next;
    });
    startTransition(() => voteForSuggestion(id));
  }

  const ordered = [...suggestions].sort(
    (a, b) => (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0),
  );

  return (
    <div className="flex flex-col gap-3">
      {ordered.map((s) => {
        const count = voteCounts.get(s.id) ?? 0;
        const isMine = myVote === s.id;

        return (
          <div key={s.id} className="glass-surface flex items-center gap-4 rounded-2xl px-6 py-5">
            <Link href={`/idees/${s.id}`} className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold hover:underline">
                {s.wonAt ? `🏆 ${s.title}` : s.title}
              </p>
              <p className="text-xs text-foreground/50">{formatDate(locale, s.createdAt)}</p>
            </Link>

            {s.wonAt ? (
              <span className="shrink-0 rounded-2xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                {t("wonBadge")}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleVote(s.id)}
                className={`flex shrink-0 flex-col items-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  isMine
                    ? "bg-brand-600 text-white shadow-md"
                    : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                }`}
              >
                <span>{isMine ? t("voted") : t("voteButton")}</span>
                <span className="text-xs opacity-80">{t("votesCount", { count })}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
