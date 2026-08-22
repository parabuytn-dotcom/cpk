"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { redirect } from "@/i18n/navigation";
import { getMyClassIds } from "./data";
import { sendMessageSchema, type FormState } from "./schemas";

export async function sendMessage(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = sendMessageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    content: formData.get("content"),
  });
  if (!validated.success) return { message: "Message invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: validated.data.conversationId,
    author_id: profile.id,
    content: validated.data.content,
  });

  if (error) return { message: error.message };

  revalidatePath(`/messages/${validated.data.conversationId}`);
  return { success: "" };
}

export async function markConversationRead(conversationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", profile.id);

  revalidatePath("/messages");
}

/**
 * Opens (or creates) a direct conversation with another user — only allowed
 * if they share at least one class group, matching the privacy scope chosen
 * for this feature (no open-to-everyone directory).
 */
export async function startDirectConversation(otherUserId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");
  if (otherUserId === profile.id) throw new Error("Impossible de se contacter soi-même.");

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Supabase (clé service_role) n'est pas configuré.");

  if (profile.role !== "admin") {
    const myClasses = await getMyClassIds(profile);

    const { data: theirMemberships } = await adminClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId);
    const theirConversationIds = (theirMemberships ?? []).map((m) => m.conversation_id);

    const { data: theirClassGroups } = theirConversationIds.length
      ? await adminClient
          .from("conversations")
          .select("class_id")
          .eq("type", "class_group")
          .in("id", theirConversationIds)
      : { data: [] as { class_id: string | null }[] };

    const theirClassIds = new Set((theirClassGroups ?? []).map((c) => c.class_id));
    const shareClass = myClasses.some((c) => theirClassIds.has(c.id));
    if (!shareClass) throw new Error("Vous ne partagez aucune classe.");
  }

  // Look for an existing direct conversation between exactly these two users.
  const { data: myMemberships } = await adminClient
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", profile.id);
  const myConversationIds = (myMemberships ?? []).map((m) => m.conversation_id);

  const { data: myDirectConvs } = myConversationIds.length
    ? await adminClient
        .from("conversations")
        .select("id")
        .eq("type", "direct")
        .in("id", myConversationIds)
    : { data: [] as { id: string }[] };
  const myDirectIds = (myDirectConvs ?? []).map((c) => c.id);

  let conversationId: string | null = null;
  if (myDirectIds.length > 0) {
    const { data: shared } = await adminClient
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", myDirectIds)
      .maybeSingle();
    conversationId = shared?.conversation_id ?? null;
  }

  if (!conversationId) {
    const { data: created, error } = await adminClient
      .from("conversations")
      .insert({ type: "direct" })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Échec de la création.");
    conversationId = created.id;

    await adminClient.from("conversation_members").insert([
      { conversation_id: conversationId, user_id: profile.id },
      { conversation_id: conversationId, user_id: otherUserId },
    ]);
  }

  redirect({ href: `/messages/${conversationId}`, locale: await getLocale() });
}
