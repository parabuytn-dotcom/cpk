"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { notify } from "@/lib/notifications/engine";
import { getOwnClass } from "./data";
import { groupSchema, groupMessageSchema, type FormState } from "./schemas";

const MAX_MEMBERS = 6;

export async function createGroup(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = groupSchema.safeParse({ name: formData.get("name") });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const ownClass = await getOwnClass(profile.id);
  if (!ownClass) return { message: "Aucune classe associée à ton compte." };

  const adminClient = createAdminClient();
  if (!adminClient) return { message: "Configuration manquante." };

  const roomSlug = `cpk-${randomBytes(8).toString("hex")}`;
  const { data: group, error } = await adminClient
    .from("groups")
    .insert({
      name: validated.data.name,
      class_id: ownClass.classId,
      class_name: ownClass.className,
      room_slug: roomSlug,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !group) return { message: error?.message ?? "Erreur." };

  await adminClient.from("group_members").insert({ group_id: group.id, user_id: profile.id, role: "owner" });

  revalidatePath("/groupes");
  return { success: "Groupe créé." };
}

/** Anyone can ask to join any group — the founder is the only one who can let them in (see acceptJoinRequest). */
export async function requestToJoinGroup(groupId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Configuration manquante.");

  const { data: existing } = await adminClient
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (existing) throw new Error("Tu as déjà demandé à rejoindre ce groupe.");

  const { error } = await adminClient
    .from("group_members")
    .insert({ group_id: groupId, user_id: profile.id, role: "member", status: "pending" });
  if (error) throw new Error(error.message);

  const { data: owner } = await adminClient
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("role", "owner")
    .maybeSingle();
  if (owner) {
    await notify(owner.user_id, "group_join_request", "Quelqu'un demande à rejoindre ton groupe de projet.", `/groupes/${groupId}`);
  }

  revalidatePath("/groupes");
  revalidatePath(`/groupes/${groupId}`);
}

export async function acceptJoinRequest(groupId: string, memberId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Configuration manquante.");

  const { data: owner } = await adminClient
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", profile.id)
    .eq("role", "owner")
    .maybeSingle();
  if (!owner) throw new Error("Seul le créateur du groupe peut accepter des membres.");

  const { count } = await adminClient
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .eq("status", "accepted");
  if ((count ?? 0) >= MAX_MEMBERS) {
    throw new Error(`Ce groupe a déjà atteint ${MAX_MEMBERS} membres.`);
  }

  const { error } = await adminClient
    .from("group_members")
    .update({ status: "accepted" })
    .eq("group_id", groupId)
    .eq("user_id", memberId);
  if (error) throw new Error(error.message);

  await notify(memberId, "group_invite", "Ta demande pour rejoindre le groupe a été acceptée.", "/groupes");

  revalidatePath("/groupes");
  revalidatePath(`/groupes/${groupId}`);
}

export async function removeGroupMember(groupId: string, memberId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Configuration manquante.");

  const isSelf = memberId === profile.id;
  if (!isSelf) {
    const { data: owner } = await adminClient
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", profile.id)
      .eq("role", "owner")
      .maybeSingle();
    if (!owner) throw new Error("Seul le créateur du groupe peut retirer des membres.");
  }

  const { error } = await adminClient
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);
  if (error) throw new Error(error.message);

  revalidatePath("/groupes");
  revalidatePath(`/groupes/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Configuration manquante.");

  const { data: owner } = await adminClient
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", profile.id)
    .eq("role", "owner")
    .maybeSingle();
  if (!owner && profile.role !== "admin") {
    throw new Error("Seul le créateur du groupe peut le supprimer.");
  }

  const { error } = await adminClient.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);

  revalidatePath("/groupes");
}

export async function sendGroupMessage(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = groupMessageSchema.safeParse({
    groupId: formData.get("groupId"),
    content: formData.get("content"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Message invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("group_messages").insert({
    group_id: validated.data.groupId,
    author_id: profile.id,
    content: validated.data.content,
  });
  if (error) return { message: error.message };

  revalidatePath(`/groupes/${validated.data.groupId}`);
  return { success: "" };
}
