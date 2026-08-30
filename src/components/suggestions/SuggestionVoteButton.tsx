"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { voteForSuggestion, removeMyVote } from "@/lib/suggestions/actions";

export default function SuggestionVoteButton({
  suggestionId,
  initialVotes,
  initialIsMine,
  wonAt,
}: {
  suggestionId: string;
  initialVotes: number;
  initialIsMine: boolean;
  wonAt: string | null;
}) {
  const t = useTranslations("suggestions");
  const [isMine, setIsMine] = useState(initialIsMine);
  const [votes, setVotes] = useState(initialVotes);
  const [, startTransition] = useTransition();

  if (wonAt) {
    return (
      <span className="inline-block w-fit rounded-2xl bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
        {t("wonBadge")}
      </span>
    );
  }

  function handleClick() {
    if (isMine) {
      setIsMine(false);
      setVotes((v) => Math.max(v - 1, 0));
      startTransition(() => removeMyVote());
    } else {
      setIsMine(true);
      setVotes((v) => v + 1);
      startTransition(() => voteForSuggestion(suggestionId));
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-fit items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
        isMine
          ? "bg-brand-600 text-white shadow-md"
          : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
      }`}
    >
      <span>{isMine ? t("voted") : t("voteButton")}</span>
      <span className="opacity-80">{t("votesCount", { count: votes })}</span>
    </button>
  );
}
