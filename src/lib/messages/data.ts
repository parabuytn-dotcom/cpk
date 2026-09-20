import "server-only";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";

export type FriendRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isBlocked: boolean;
};

/**
 * "Friends" are simply people you follow who follow you back — there's no
 * separate friend-request system to keep in sync. Blocked pairs are dropped
 * from the list entirely, in either direction.
 */
export async function listFriends(profileId: string): Promise<FriendRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase.from("follows").select("followed_id").eq("follower_id", profileId),
    supabase.from("follows").select("follower_id").eq("followed_id", profileId),
  ]);

  const followingIds = new Set((following ?? []).map((f) => f.followed_id));
  const friendIds = (followers ?? [])
    .map((f) => f.follower_id)
    .filter((id) => followingIds.has(id));

  if (friendIds.length === 0) return [];

  const [{ data: blocks }, { data: messages }, profiles] = await Promise.all([
    supabase
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${profileId},blocked_id.eq.${profileId}`),
    supabase
      .from("direct_messages")
      .select("sender_id, recipient_id, content, created_at, read_at")
      .or(`sender_id.eq.${profileId},recipient_id.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(500),
    getPublicProfiles(supabase, friendIds),
  ]);

  const blockedIds = new Set(
    (blocks ?? []).map((b) => (b.blocker_id === profileId ? b.blocked_id : b.blocker_id)),
  );

  const lastByFriend = new Map<string, { content: string; createdAt: string }>();
  const unreadByFriend = new Map<string, number>();
  for (const m of messages ?? []) {
    const other = m.sender_id === profileId ? m.recipient_id : m.sender_id;
    if (!lastByFriend.has(other)) {
      lastByFriend.set(other, { content: m.content, createdAt: m.created_at });
    }
    if (m.recipient_id === profileId && !m.read_at) {
      unreadByFriend.set(other, (unreadByFriend.get(other) ?? 0) + 1);
    }
  }

  return friendIds
    .filter((id) => !blockedIds.has(id))
    .map((id) => ({
      userId: id,
      name: profiles.get(id)?.displayName ?? "?",
      avatarUrl: profiles.get(id)?.avatarUrl ?? null,
      lastMessage: lastByFriend.get(id)?.content ?? null,
      lastMessageAt: lastByFriend.get(id)?.createdAt ?? null,
      unreadCount: unreadByFriend.get(id) ?? 0,
    }))
    .map((f) => ({ ...f, isBlocked: false }))
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
}

export type DirectMessageRow = {
  id: string;
  senderId: string;
  content: string | null;
  mediaPath: string | null;
  mediaType: "image" | "audio" | null;
  mediaDuration: number | null;
  createdAt: string;
};

export type ConversationDetail = {
  friend: { userId: string; name: string; avatarUrl: string | null };
  messages: DirectMessageRow[];
  roomSlug: string;
  areFriends: boolean;
  isBlockedByMe: boolean;
  isBlockedByThem: boolean;
};

/**
 * Both sides must derive the SAME call room name without storing one, so it's
 * a hash of the two ids sorted — order-independent by construction.
 */
export function conversationRoomSlug(a: string, b: string) {
  const pair = [a, b].sort().join(":");
  return `cpk-dm-${createHash("sha256").update(pair).digest("hex").slice(0, 20)}`;
}

export async function getConversation(
  profileId: string,
  otherId: string,
): Promise<ConversationDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const [{ data: following }, { data: followedBy }, { data: blocks }] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", profileId)
      .eq("followed_id", otherId)
      .maybeSingle(),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", otherId)
      .eq("followed_id", profileId)
      .maybeSingle(),
    supabase
      .from("user_blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${profileId},blocked_id.eq.${profileId}`),
  ]);

  const profiles = await getPublicProfiles(supabase, [otherId]);
  const other = profiles.get(otherId);
  if (!other) return null;

  const relevantBlocks = (blocks ?? []).filter(
    (b) =>
      (b.blocker_id === profileId && b.blocked_id === otherId) ||
      (b.blocker_id === otherId && b.blocked_id === profileId),
  );
  const isBlockedByMe = relevantBlocks.some((b) => b.blocker_id === profileId);
  const isBlockedByThem = relevantBlocks.some((b) => b.blocker_id === otherId);

  let messages: DirectMessageRow[] = [];
  if (!isBlockedByMe && !isBlockedByThem) {
    const { data } = await supabase
      .from("direct_messages")
      .select("id, sender_id, recipient_id, content, media_path, media_type, media_duration, created_at")
      .or(
        `and(sender_id.eq.${profileId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${profileId})`,
      )
      .order("created_at", { ascending: true })
      .limit(300);

    messages = (data ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      content: m.content,
      mediaPath: m.media_path,
      mediaType: m.media_type,
      mediaDuration: m.media_duration,
      createdAt: m.created_at,
    }));
  }

  return {
    friend: { userId: otherId, name: other.displayName, avatarUrl: other.avatarUrl },
    messages,
    roomSlug: conversationRoomSlug(profileId, otherId),
    areFriends: Boolean(following && followedBy),
    isBlockedByMe,
    isBlockedByThem,
  };
}

export async function countUnreadMessages(profileId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", profileId)
    .is("read_at", null);
  return count ?? 0;
}
