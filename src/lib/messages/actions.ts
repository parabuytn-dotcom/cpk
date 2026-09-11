"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { notify } from "@/lib/notifications/engine";

export type FormState =
  | { errors?: Record<string, string[]>; message?: string; success?: string }
  | undefined;

const messageSchema = z.object({
  recipientId: z.string().uuid(),
  content: z.string().trim().min(1, "Message vide.").max(2000, "Message trop long."),
});

const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.string().trim().min(3, "Explique brièvement le problème.").max(1000, "Trop long."),
  context: z.string().trim().max(40).optional().or(z.literal("")),
});

/** Mutual follow, checked server-side as well as in the RLS insert policy. */
async function assertFriends(profileId: string, otherId: string) {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Configuration manquante.");

  const { data: rows } = await adminClient
    .from("follows")
    .select("follower_id, followed_id")
    .or(
      `and(follower_id.eq.${profileId},followed_id.eq.${otherId}),and(follower_id.eq.${otherId},followed_id.eq.${profileId})`,
    );

  const following = (rows ?? []).some(
    (r) => r.follower_id === profileId && r.followed_id === otherId,
  );
  const followedBy = (rows ?? []).some(
    (r) => r.follower_id === otherId && r.followed_id === profileId,
  );
  if (!following || !followedBy) {
    throw new Error("Vous devez vous suivre mutuellement pour discuter.");
  }

  const { data: blocks } = await adminClient
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${profileId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${profileId})`,
    );
  if ((blocks ?? []).length > 0) {
    throw new Error("Conversation indisponible.");
  }
}

export async function sendDirectMessage(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = messageSchema.safeParse({
    recipientId: formData.get("recipientId"),
    content: formData.get("content"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Message invalide." };
  }

  try {
    await assertFriends(profile.id, validated.data.recipientId);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Erreur." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("direct_messages").insert({
    sender_id: profile.id,
    recipient_id: validated.data.recipientId,
    content: validated.data.content,
  });
  if (error) return { message: error.message };

  await notify(
    validated.data.recipientId,
    "direct_message",
    `Nouveau message de ${profile.fullName ?? "un ami"}.`,
    `/messages/${profile.id}`,
  );

  revalidatePath(`/messages/${validated.data.recipientId}`);
  revalidatePath("/messages");
  return { success: "" };
}

export async function markConversationRead(otherId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .eq("sender_id", otherId)
    .is("read_at", null);

  revalidatePath("/messages");
}

export async function setBlocked(userId: string, blocked: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");
  if (userId === profile.id) throw new Error("Action impossible.");

  const supabase = await createClient();
  if (blocked) {
    const { error } = await supabase
      .from("user_blocks")
      .insert({ blocker_id: profile.id, blocked_id: userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", profile.id)
      .eq("blocked_id", userId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${userId}`);
  revalidatePath(`/profil/${userId}`);
}

export async function reportUser(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = reportSchema.safeParse({
    reportedId: formData.get("reportedId"),
    reason: formData.get("reason"),
    context: formData.get("context") ?? "",
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Signalement invalide." };
  }
  if (validated.data.reportedId === profile.id) {
    return { message: "Action impossible." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_reports").insert({
    reporter_id: profile.id,
    reported_id: validated.data.reportedId,
    reason: validated.data.reason,
    context: validated.data.context || null,
  });
  if (error) return { message: error.message };

  return { success: "Signalement envoyé à l'administration. Merci." };
}
