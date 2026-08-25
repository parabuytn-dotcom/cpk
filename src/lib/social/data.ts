import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type CommentRow = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
};

export type FeedPostRow = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  mediaType: "image" | "video" | null;
  mediaUrl: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  comments: CommentRow[];
};

export type PublicProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
};

// Row-level security on `profiles` only lets a user read their own row (or an
// admin read any row) — necessary since CIN/phone/etc. live there. But name +
// photo must be visible to everyone (feed, comments, public profiles), so we
// go through the `get_public_profiles` RPC, which is security-definer and
// deliberately exposes only those 4 safe columns.
export async function getPublicProfiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, PublicProfile>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, PublicProfile>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase.rpc("get_public_profiles", { ids: uniqueIds });
  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      displayName: row.display_name ?? "?",
      avatarUrl: row.avatar_url,
      role: row.role,
    });
  }
  return map;
}

export async function listFeedPosts(
  currentUserId?: string,
  authorId?: string,
): Promise<FeedPostRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  let query = supabase
    .from("feed_posts")
    .select("id, author_id, content, media_type, media_path, created_at")
    .order("created_at", { ascending: false })
    .limit(authorId ? 100 : 50);
  if (authorId) query = query.eq("author_id", authorId);
  const { data: posts } = await query;

  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  const [{ data: likes }, { data: comments }] = await Promise.all([
    supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("id, post_id, author_id, content, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
  ]);

  const profileIds = [
    ...posts.map((p) => p.author_id),
    ...(comments ?? []).map((c) => c.author_id),
  ].filter((id): id is string => Boolean(id));
  const profiles = await getPublicProfiles(supabase, profileIds);

  const likesByPost = new Map<string, string[]>();
  for (const like of likes ?? []) {
    likesByPost.set(like.post_id, [...(likesByPost.get(like.post_id) ?? []), like.user_id]);
  }

  const commentsByPost = new Map<string, CommentRow[]>();
  for (const comment of comments ?? []) {
    const commentProfile = comment.author_id ? profiles.get(comment.author_id) : undefined;
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push({
      id: comment.id,
      authorId: comment.author_id,
      authorName: commentProfile?.displayName ?? "?",
      authorAvatarUrl: commentProfile?.avatarUrl ?? null,
      content: comment.content,
      createdAt: comment.created_at,
    });
    commentsByPost.set(comment.post_id, list);
  }

  return posts.map((post) => {
    const profile = post.author_id ? profiles.get(post.author_id) : undefined;
    const likers = likesByPost.get(post.id) ?? [];
    const mediaUrl = post.media_path
      ? supabase.storage.from("feed-media").getPublicUrl(post.media_path).data.publicUrl
      : null;

    return {
      id: post.id,
      authorId: post.author_id,
      authorName: profile?.displayName ?? "?",
      authorAvatarUrl: profile?.avatarUrl ?? null,
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
