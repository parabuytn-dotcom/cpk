import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";

export type MyStatus = "owner" | "accepted" | "pending" | "none";

export type GroupListRow = {
  id: string;
  name: string;
  className: string;
  memberCount: number;
  myStatus: MyStatus;
};

/**
 * Every group is visible to every student, not just its members — matches
 * a class roster that's proven too unreliable to gate visibility on (some
 * students rows are missing class_id, so "same class" checks kept hiding
 * real classmates from each other). Anyone can request to join; only the
 * founder decides who actually gets in (see requestToJoinGroup/
 * acceptJoinRequest in actions.ts).
 */
export async function listAllGroups(profileId: string): Promise<GroupListRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [{ data: groups }, { data: allMembers }] = await Promise.all([
    supabase.from("groups").select("id, name, class_name").order("created_at", { ascending: false }),
    supabase.from("group_members").select("group_id, user_id, role, status"),
  ]);

  const counts = new Map<string, number>();
  const mine = new Map<string, { role: string; status: string }>();
  for (const m of allMembers ?? []) {
    if (m.status === "accepted") counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    if (m.user_id === profileId) mine.set(m.group_id, { role: m.role, status: m.status });
  }

  return (groups ?? []).map((g) => {
    const own = mine.get(g.id);
    const myStatus: MyStatus = !own
      ? "none"
      : own.role === "owner"
        ? "owner"
        : own.status === "accepted"
          ? "accepted"
          : "pending";
    return {
      id: g.id,
      name: g.name,
      className: g.class_name,
      memberCount: counts.get(g.id) ?? 0,
      myStatus,
    };
  });
}

export type GroupMemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
};

export type GroupMessageRow = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
};

export type GroupDetail = {
  id: string;
  name: string;
  className: string;
  /** Only present once the caller is an accepted member/owner — a pending or unrelated viewer never learns the call room's address. */
  roomSlug: string | null;
  members: GroupMemberRow[];
  pendingMembers: GroupMemberRow[];
  messages: GroupMessageRow[];
  myStatus: MyStatus;
};

/** Returns null only if the group itself doesn't exist — every group is visible to every student, see listAllGroups. */
export async function getGroupDetail(groupId: string, profileId: string): Promise<GroupDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, class_name, room_slug")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;

  const { data: membersRaw } = await supabase
    .from("group_members")
    .select("user_id, role, status")
    .eq("group_id", groupId);

  const own = (membersRaw ?? []).find((m) => m.user_id === profileId);
  const myStatus: MyStatus = !own
    ? "none"
    : own.role === "owner"
      ? "owner"
      : own.status === "accepted"
        ? "accepted"
        : "pending";
  const isMember = myStatus === "owner" || myStatus === "accepted";

  const allIds = (membersRaw ?? []).map((m) => m.user_id);
  const profiles = await getPublicProfiles(supabase, allIds);
  const toRow = (m: { user_id: string; role: string; status: string }): GroupMemberRow => ({
    userId: m.user_id,
    name: profiles.get(m.user_id)?.displayName ?? "?",
    avatarUrl: profiles.get(m.user_id)?.avatarUrl ?? null,
    role: m.role,
    status: m.status,
  });
  const members = (membersRaw ?? []).filter((m) => m.status === "accepted").map(toRow);
  const pendingMembers = (membersRaw ?? []).filter((m) => m.status === "pending").map(toRow);

  let messages: GroupMessageRow[] = [];
  if (isMember) {
    const { data: messagesRaw } = await supabase
      .from("group_messages")
      .select("id, author_id, content, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(300);

    const authorIds = (messagesRaw ?? [])
      .map((m) => m.author_id)
      .filter((id): id is string => Boolean(id));
    const authorProfiles = await getPublicProfiles(supabase, authorIds);

    messages = (messagesRaw ?? []).map((m) => ({
      id: m.id,
      authorId: m.author_id,
      authorName: m.author_id ? (authorProfiles.get(m.author_id)?.displayName ?? "?") : "?",
      authorAvatarUrl: m.author_id ? (authorProfiles.get(m.author_id)?.avatarUrl ?? null) : null,
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  return {
    id: group.id,
    name: group.name,
    className: group.class_name,
    roomSlug: isMember ? group.room_slug : null,
    members,
    pendingMembers,
    messages,
    myStatus,
  };
}

export async function getOwnClass(
  profileId: string,
): Promise<{ classId: string | null; className: string } | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("class_id, class_name")
    .eq("user_id", profileId)
    .maybeSingle();

  // class_name is the one field every students row is guaranteed to have —
  // class_id can be null on rows that predate that column.
  if (!data?.class_name) return null;
  return { classId: data.class_id, className: data.class_name };
}
