"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addComment } from "@/lib/social/actions";
import Avatar from "@/components/ui/Avatar";
import type { CommentRow } from "@/lib/social/data";

export default function CommentSection({
  postId,
  comments,
}: {
  postId: string;
  comments: CommentRow[];
}) {
  const t = useTranslations("feed");
  const [expanded, setExpanded] = useState(false);
  const [, action, pending] = useActionState(addComment, undefined);

  // `comments` is oldest-first, so the last item is the most recent one —
  // collapsed view shows just that, same as Instagram's "view all N comments".
  const visibleComments = expanded ? comments : comments.slice(-1);
  const hiddenCount = comments.length - visibleComments.length;

  return (
    <div className="flex flex-col gap-2">
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-left text-sm text-foreground/50 hover:underline"
        >
          {t("viewAllComments", { count: comments.length })}
        </button>
      )}

      {visibleComments.map((c) => (
        <div key={c.id} className="flex items-start gap-2">
          {c.authorId ? (
            <Link href={`/profil/${c.authorId}`} className="shrink-0">
              <Avatar name={c.authorName} photoUrl={c.authorAvatarUrl} size={24} />
            </Link>
          ) : (
            <Avatar name={c.authorName} photoUrl={c.authorAvatarUrl} size={24} />
          )}
          <p className="text-sm">
            {c.authorId ? (
              <Link href={`/profil/${c.authorId}`} className="font-semibold hover:underline">
                {c.authorName}
              </Link>
            ) : (
              <span className="font-semibold">{c.authorName}</span>
            )}{" "}
            <span className="text-foreground/80">{c.content}</span>
          </p>
        </div>
      ))}

      <form action={action} className="flex gap-2 pt-1">
        <input type="hidden" name="postId" value={postId} />
        <input
          id={`comment-input-${postId}`}
          name="content"
          placeholder={t("commentPlaceholder")}
          required
          className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {t("send")}
        </button>
      </form>
    </div>
  );
}
