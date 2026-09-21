"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSchoolStaff } from "@/lib/admin/guard";

// Half-groups: while one half has physics the other has science, then they
// swap. Each pupil is assigned to a group so their timetable only shows their
// own lessons.

export async function createClassGroup(classId: string, name: string) {
  await requireSchoolStaff();
  const db = createAdminClient();
  if (!db || !name.trim()) return;

  await db.from("class_groups").insert({ class_id: classId, name: name.trim() });
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
}

export async function deleteClassGroup(groupId: string) {
  await requireSchoolStaff();
  const db = createAdminClient();
  if (!db) return;

  // The timetable rows keep their slot and fall back to "the whole class".
  await db.from("class_groups").delete().eq("id", groupId);
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
}

/** Puts one person in a group, or takes them out of it. */
export async function setGroupMembership(groupId: string, userId: string, member: boolean) {
  await requireSchoolStaff();
  const db = createAdminClient();
  if (!db) return;

  if (member) {
    await db.from("class_group_members").upsert({ class_group_id: groupId, user_id: userId }, { onConflict: "class_group_id,user_id" });
  } else {
    await db.from("class_group_members").delete().eq("class_group_id", groupId).eq("user_id", userId);
  }
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
}
