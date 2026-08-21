"use client";

import { useActionState } from "react";
import { addComment } from "@/lib/social/actions";
import type { CommentRow } from "@/lib/social/data";

export default function CommentSection({
  postId,
  comments,
}: {
  postId: string;
  comments: CommentRow[];
}) {
  const [, action, pending] = useActionState(addComment, undefined);

  return (
    <div className="flex flex-col gap-2 border-t border-black/5 pt-3 dark:border-white/10">
      {comments.map((c) => (
        <p key={c.id} className="text-sm">
          <span className="font-semibold">{c.authorName}</span>{" "}
          <span className="text-foreground/80">{c.content}</span>
        </p>
      ))}

      <form action={action} className="flex gap-2">
        <input type="hidden" name="postId" value={postId} />
        <input
          name="content"
          placeholder="Écrire un commentaire…"
          required
          className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
