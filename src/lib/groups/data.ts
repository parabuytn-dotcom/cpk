import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";

export type MyGroupRow = {
  id: string;
  name: string;
  className: string;
  memberCount: number;
};

export async function listMyGroups(profileId: string): Promise<MyGroupRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", profileId);

  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return [];

  const [{ data: groups }, { data: allMembers }] = await Promise.all([
    supabase.from("groups").select("id, name, class_name").in("id", groupIds),
    supabase.from("group_members").select("group_id").in("group_id", groupIds),
  ]);

  const counts = new Map<string, number>();
  for (const m of allMembers ?? []) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);

  return (groups ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    className: g.class_name,
    memberCount: counts.get(g.id) ?? 0,
  }));
}

export type GroupMemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
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
  roomSlug: string;
  members: GroupMemberRow[];
  messages: GroupMessageRow[];
  isOwner: boolean;
};

/** Returns null if the group doesn't exist or the caller isn't a member (RLS would already hide it either way). */
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
    .select("user_id, role")
    .eq("group_id", groupId);

  const memberIds = (membersRaw ?? []).map((m) => m.user_id);
  if (!memberIds.includes(profileId)) return null;

  const profiles = await getPublicProfiles(supabase, memberIds);
  const members: GroupMemberRow[] = (membersRaw ?? []).map((m) => ({
    userId: m.user_id,
    name: profiles.get(m.user_id)?.displayName ?? "?",
    avatarUrl: profiles.get(m.user_id)?.avatarUrl ?? null,
    role: m.role,
  }));

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

  const messages: GroupMessageRow[] = (messagesRaw ?? []).map((m) => ({
    id: m.id,
    authorId: m.author_id,
    authorName: m.author_id ? (authorProfiles.get(m.author_id)?.displayName ?? "?") : "?",
    authorAvatarUrl: m.author_id ? (authorProfiles.get(m.author_id)?.avatarUrl ?? null) : null,
    content: m.content,
    createdAt: m.created_at,
  }));

  return {
    id: group.id,
    name: group.name,
    className: group.class_name,
    roomSlug: group.room_slug,
    members,
    messages,
    isOwner: members.find((m) => m.userId === profileId)?.role === "owner",
  };
}

export type ClassmateRow = { userId: string; name: string };

export async function listClassmates(classId: string, excludeUserIds: string[]): Promise<ClassmateRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("user_id, first_name, last_name")
    .eq("class_id", classId)
    .not("user_id", "is", null);

  return (data ?? [])
    .filter((s) => s.user_id && !excludeUserIds.includes(s.user_id))
    .map((s) => ({
      userId: s.user_id as string,
      name: `${s.first_name} ${s.last_name ?? ""}`.trim(),
    }));
}

export async function getOwnClass(
  profileId: string,
): Promise<{ classId: string; className: string } | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("class_id, class_name")
    .eq("user_id", profileId)
    .maybeSingle();

  if (!data?.class_id) return null;
  return { classId: data.class_id, className: data.class_name };
}
