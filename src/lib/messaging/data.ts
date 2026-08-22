import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import type { CurrentProfile } from "@/lib/auth/session";

export type MyClass = { id: string; name: string };

/** Classes relevant to this user — the source of truth for class-group membership. */
export async function getMyClassIds(profile: CurrentProfile): Promise<MyClass[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  if (profile.role === "admin") {
    const { data } = await supabase.from("classes").select("id, name").order("name");
    return data ?? [];
  }

  if (profile.role === "parent") {
    const { data } = await supabase
      .from("students")
      .select("class_id, classes(id, name)")
      .eq("parent_id", profile.id)
      .not("class_id", "is", null);
    return dedupeClasses((data ?? []).map((r) => (Array.isArray(r.classes) ? r.classes[0] : r.classes)));
  }

  if (profile.role === "student") {
    const { data } = await supabase
      .from("students")
      .select("class_id, classes(id, name)")
      .eq("user_id", profile.id)
      .not("class_id", "is", null);
    return dedupeClasses((data ?? []).map((r) => (Array.isArray(r.classes) ? r.classes[0] : r.classes)));
  }

  if (profile.role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!teacher) return [];

    const { data } = await supabase
      .from("timetable_entries")
      .select("class_id, classes(id, name)")
      .eq("teacher_id", teacher.id)
      .not("class_id", "is", null);
    return dedupeClasses((data ?? []).map((r) => (Array.isArray(r.classes) ? r.classes[0] : r.classes)));
  }

  return [];
}

function dedupeClasses(rows: (MyClass | null | undefined)[]): MyClass[] {
  const map = new Map<string, MyClass>();
  for (const r of rows) if (r) map.set(r.id, r);
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Ensures a class-group conversation exists for each class the user belongs
 * to, and that they're a member of it. Cheap idempotent upserts — called
 * whenever /messages is opened rather than hooked into every mutation point
 * (registration, timetable edits...) that could change class membership.
 */
export async function reconcileClassGroupMemberships(profile: CurrentProfile) {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  const classes = await getMyClassIds(profile);
  if (classes.length === 0) return;

  for (const klass of classes) {
    let { data: conversation } = await adminClient
      .from("conversations")
      .select("id")
      .eq("type", "class_group")
      .eq("class_id", klass.id)
      .maybeSingle();

    if (!conversation) {
      const { data: created } = await adminClient
        .from("conversations")
        .insert({ type: "class_group", class_id: klass.id })
        .select("id")
        .single();
      conversation = created;
    }
    if (!conversation) continue;

    await adminClient
      .from("conversation_members")
      .upsert(
        { conversation_id: conversation.id, user_id: profile.id },
        { onConflict: "conversation_id,user_id", ignoreDuplicates: true },
      );
  }
}

export type ConversationSummary = {
  id: string;
  type: "class_group" | "direct";
  title: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function displayName(profile: { full_name: string | null; parent_first_name: string | null } | null) {
  if (!profile) return "?";
  return profile.full_name ?? profile.parent_first_name ?? "?";
}

export async function listMyConversations(profile: CurrentProfile): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", profile.id);

  if (!memberships || memberships.length === 0) return [];
  const conversationIds = memberships.map((m) => m.conversation_id);
  const lastReadByConv = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, type, class_id, classes(name)")
    .in("id", conversationIds);

  if (!conversations || conversations.length === 0) return [];

  const { data: lastMessages } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastByConv = new Map<string, { content: string; created_at: string }>();
  const unreadByConv = new Map<string, number>();
  for (const m of lastMessages ?? []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { content: m.content, created_at: m.created_at });
    }
    const lastRead = lastReadByConv.get(m.conversation_id);
    if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
      unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }
  }

  // Direct conversations need the *other* member's name for the title.
  const directIds = conversations.filter((c) => c.type === "direct").map((c) => c.id);
  const otherMemberNameByConv = new Map<string, string>();
  if (directIds.length > 0) {
    const { data: otherMembers } = await supabase
      .from("conversation_members")
      .select("conversation_id, profiles(full_name, parent_first_name)")
      .in("conversation_id", directIds)
      .neq("user_id", profile.id);

    for (const row of otherMembers ?? []) {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      otherMemberNameByConv.set(row.conversation_id, displayName(p));
    }
  }

  const summaries = conversations.map((c) => {
    const klass = Array.isArray(c.classes) ? c.classes[0] : c.classes;
    const last = lastByConv.get(c.id);
    return {
      id: c.id,
      type: c.type as "class_group" | "direct",
      title: c.type === "class_group" ? (klass?.name ?? "Classe") : (otherMemberNameByConv.get(c.id) ?? "?"),
      lastMessage: last?.content ?? null,
      lastMessageAt: last?.created_at ?? null,
      unreadCount: unreadByConv.get(c.id) ?? 0,
    };
  });

  return summaries.sort((a, b) => {
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

export type ConversationMeta = { id: string; type: "class_group" | "direct"; title: string } | null;

export async function getConversationMeta(
  conversationId: string,
  profile: CurrentProfile,
): Promise<ConversationMeta> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, type, classes(name)")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) return null;

  if (conversation.type === "class_group") {
    const klass = Array.isArray(conversation.classes) ? conversation.classes[0] : conversation.classes;
    return { id: conversation.id, type: "class_group", title: klass?.name ?? "Classe" };
  }

  const { data: otherMember } = await supabase
    .from("conversation_members")
    .select("profiles(full_name, parent_first_name)")
    .eq("conversation_id", conversationId)
    .neq("user_id", profile.id)
    .maybeSingle();

  const p = otherMember
    ? Array.isArray(otherMember.profiles)
      ? otherMember.profiles[0]
      : otherMember.profiles
    : null;

  return { id: conversation.id, type: "direct", title: displayName(p) };
}

export type MessageRow = {
  id: string;
  authorId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
};

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data } = await supabase
    .from("messages")
    .select("id, author_id, content, created_at, profiles(full_name, parent_first_name)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (data ?? []).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      authorId: m.author_id,
      authorName: displayName(p),
      content: m.content,
      createdAt: m.created_at,
    };
  });
}

export type ConversationMember = { id: string; name: string };

export async function listConversationMembers(
  conversationId: string,
  excludeUserId: string,
): Promise<ConversationMember[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  const { data } = await supabase
    .from("conversation_members")
    .select("user_id, profiles(full_name, parent_first_name)")
    .eq("conversation_id", conversationId)
    .neq("user_id", excludeUserId);

  return (data ?? []).map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { id: row.user_id, name: displayName(p) };
  });
}

export async function countUnreadMessages(profile: CurrentProfile): Promise<number> {
  const conversations = await listMyConversations(profile);
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}
