import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClassGroup, GroupMember } from "@/components/admin/ClassGroupsManager";

// Read side of the half-groups, kept apart from classGroups.ts because that
// file is a "use server" module and may only export actions.

export async function listClassGroups(classId: string): Promise<ClassGroup[]> {
  const db = createAdminClient();
  if (!db) return [];

  const [{ data: groups }, { data: members }] = await Promise.all([
    db.from("class_groups").select("id, name").eq("class_id", classId).order("name"),
    db.from("class_group_members").select("class_group_id, user_id"),
  ]);

  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    memberIds: (members ?? [])
      .filter((m) => m.class_group_id === group.id)
      .map((m) => m.user_id),
  }));
}

/** Everyone in the class, to tick off group by group. */
export async function listClassMembers(classId: string): Promise<GroupMember[]> {
  const db = createAdminClient();
  if (!db) return [];

  const { data } = await db
    .from("students")
    .select("user_id, first_name, last_name")
    .eq("class_id", classId)
    .not("user_id", "is", null)
    .order("first_name");

  return (data ?? []).map((pupil) => ({
    userId: pupil.user_id as string,
    name: [pupil.first_name, pupil.last_name].filter(Boolean).join(" "),
  }));
}
