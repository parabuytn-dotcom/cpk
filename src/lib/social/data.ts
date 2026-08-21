import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type CommentRow = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type FeedPostRow = {
  id: string;
  authorName: string;
  content: string;
  mediaType: "image" | "video" | null;
  mediaUrl: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  comments: CommentRow[];
};

function authorName(profile: { full_name: string | null; parent_first_name: string | null } | null) {
  if (!profile) return "?";
  return profile.full_name ?? profile.parent_first_name ?? "?";
}

export async function listFeedPosts(currentUserId?: string): Promise<FeedPostRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("feed_posts")
    .select(
      "id, content, media_type, media_path, created_at, profiles(full_name, parent_first_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("id, post_id, content, created_at, profiles(full_name, parent_first_name)")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  const likesByPost = new Map<string, string[]>();
  for (const like of likes ?? []) {
    likesByPost.set(like.post_id, [...(likesByPost.get(like.post_id) ?? []), like.user_id]);
  }

  const commentsByPost = new Map<string, CommentRow[]>();
  for (const comment of comments ?? []) {
    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push({
      id: comment.id,
      authorName: authorName(profile),
      content: comment.content,
      createdAt: comment.created_at,
    });
    commentsByPost.set(comment.post_id, list);
  }

  return posts.map((post) => {
    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    const likers = likesByPost.get(post.id) ?? [];
    const mediaUrl = post.media_path
      ? supabase.storage.from("feed-media").getPublicUrl(post.media_path).data.publicUrl
      : null;

    return {
      id: post.id,
      authorName: authorName(profile),
      content: post.content,
      mediaType: post.media_type,
      mediaUrl,
      createdAt: post.created_at,
      likeCount: likers.length,
      likedByMe: currentUserId ? likers.includes(currentUserId) : false,
      comments: commentsByPost.get(post.id) ?? [],
    };
  });
}
