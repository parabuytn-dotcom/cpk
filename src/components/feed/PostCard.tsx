import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/ui/Avatar";
import PostActionsRow from "./PostActionsRow";
import CommentSection from "./CommentSection";
import DeletePostButton from "./DeletePostButton";
import { formatRelativeTime } from "@/lib/formatDate";
import { SITE_URL } from "@/lib/siteUrl";
import type { FeedPostRow } from "@/lib/social/data";

export default async function PostCard({
  post,
  canDelete,
}: {
  post: FeedPostRow;
  canDelete: boolean;
}) {
  const locale = await getLocale();
  const shareUrl = `${SITE_URL}/${locale}/feed/${post.id}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white dark:border-white/10 dark:bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-3">
        {post.authorId ? (
          <Link href={`/profil/${post.authorId}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={post.authorName} photoUrl={post.authorAvatarUrl} size={36} />
            <p className="truncate text-sm font-semibold hover:underline">{post.authorName}</p>
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={post.authorName} photoUrl={post.authorAvatarUrl} size={36} />
            <p className="truncate text-sm font-semibold">{post.authorName}</p>
          </div>
        )}
        {canDelete && <DeletePostButton postId={post.id} />}
      </div>

      {post.mediaUrl && post.mediaType === "image" && (
        <div className="relative aspect-square w-full bg-black/5">
          <Image src={post.mediaUrl} alt="" fill className="object-cover" />
        </div>
      )}

      {post.mediaUrl && post.mediaType === "video" && (
        <video src={post.mediaUrl} controls className="aspect-square w-full bg-black object-contain" />
      )}

      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm">
          <span className="font-semibold">{post.authorName}</span> {post.content}
        </p>

        <PostActionsRow
          postId={post.id}
          initialLiked={post.likedByMe}
          initialCount={post.likeCount}
          commentAnchor={`#comment-input-${post.id}`}
          shareUrl={shareUrl}
        />

        <CommentSection postId={post.id} comments={post.comments} />

        <p className="text-xs uppercase text-foreground/40">{formatRelativeTime(locale, post.createdAt)}</p>
      </div>
    </article>
  );
}
