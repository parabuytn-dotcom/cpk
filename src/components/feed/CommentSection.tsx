"use client";

import { useActionState } from "react";
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
  const [, action, pending] = useActionState(addComment, undefined);

  return (
    <div className="flex flex-col gap-2 border-t border-black/5 pt-3 dark:border-white/10">
      {comments.map((c) => (
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

      <form action={action} className="flex gap-2">
        <input type="hidden" name="postId" value={postId} />
        <input
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
