import Image from "next/image";
import { getLocale } from "next-intl/server";
import Avatar from "@/components/ui/Avatar";
import LikeButton from "./LikeButton";
import CommentSection from "./CommentSection";
import { formatDateTime } from "@/lib/formatDate";
import type { FeedPostRow } from "@/lib/social/data";

export default async function PostCard({ post }: { post: FeedPostRow }) {
  const locale = await getLocale();

  return (
    <article className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <Avatar name={post.authorName} photoUrl={post.authorAvatarUrl} size={40} />
        <div>
          <p className="font-semibold">{post.authorName}</p>
          <p className="text-xs text-foreground/50">{formatDateTime(locale, post.createdAt)}</p>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-foreground/90">{post.content}</p>

      {post.mediaUrl && post.mediaType === "image" && (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black/5">
          <Image src={post.mediaUrl} alt="" fill className="object-cover" />
        </div>
      )}

      {post.mediaUrl && post.mediaType === "video" && (
        <video src={post.mediaUrl} controls className="w-full rounded-2xl bg-black" />
      )}

      <div className="flex items-center gap-2">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
      </div>

      <CommentSection postId={post.id} comments={post.comments} />
    </article>
  );
}
