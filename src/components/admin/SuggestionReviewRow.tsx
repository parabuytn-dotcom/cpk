"use client";

import { useState, useTransition } from "react";
import { validateSuggestion, rejectSuggestion } from "@/lib/admin/actions";
import type { PendingSuggestionRow } from "@/lib/admin/data";

export default function SuggestionReviewRow({
  suggestion,
}: {
  suggestion: PendingSuggestionRow;
}) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleValidate() {
    if (!title.trim()) {
      setError("Donne un titre avant de valider.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await validateSuggestion(suggestion.id, title);
        setDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleReject() {
    if (!confirm("Rejeter cette proposition ?")) return;
    startTransition(async () => {
      await rejectSuggestion(suggestion.id);
      setDone(true);
    });
  }

  if (done) return null;

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-2xl px-5 py-4">
      <div>
        <p className="text-xs text-foreground/50">
          {suggestion.authorName} ·{" "}
          {new Date(suggestion.createdAt).toLocaleDateString("fr-FR")}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">{suggestion.content}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre public de la proposition"
          className="min-w-48 flex-1 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={isPending}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
        >
          Valider
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-foreground/60 transition hover:border-red-500/50 hover:text-red-600 disabled:opacity-60 dark:border-white/10"
        >
          Rejeter
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
