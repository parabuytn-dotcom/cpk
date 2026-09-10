"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { getCurrentProfile } from "@/lib/auth/session";
import { notifyMany } from "./engine";

export type NotificationTargetKind = "user" | "class" | "tag" | "role" | "all";

export type SendNotificationInput = {
  targetKind: NotificationTargetKind;
  /** Profile id, class name, tag, or role — unused for "all". */
  targetValue: string;
  title: string;
  message: string;
  link: string;
  /** Also pops up as a blocking modal on the recipient's next page load. */
  intrusive: boolean;
};

type Result = { success: true; recipients: number } | { success: false; error: string };

/**
 * Resolves a target to the profile ids that should receive the notification.
 * Class targeting deliberately reaches BOTH the students of that class and
 * their parents — an announcement about a class concerns the families too.
 */
async function resolveRecipients(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>,
  kind: NotificationTargetKind,
  value: string,
): Promise<string[]> {
  if (kind === "user") return [value];

  if (kind === "all") {
    const { data } = await adminClient.from("profiles").select("id");
    return (data ?? []).map((p) => p.id);
  }

  if (kind === "role") {
    const { data } = await adminClient.from("profiles").select("id").eq("role", value);
    return (data ?? []).map((p) => p.id);
  }

  if (kind === "tag") {
    const { data } = await adminClient.from("profiles").select("id").contains("tags", [value]);
    return (data ?? []).map((p) => p.id);
  }

  // kind === "class": match on class_name, the one field every students row
  // reliably has (class_id is null on older rows — same caveat as elsewhere).
  const { data: students } = await adminClient
    .from("students")
    .select("user_id, parent_id")
    .eq("class_name", value);

  const ids = new Set<string>();
  for (const s of students ?? []) {
    if (s.user_id) ids.add(s.user_id);
    if (s.parent_id) ids.add(s.parent_id);
  }
  return [...ids];
}

export async function sendCustomNotification(input: SendNotificationInput): Promise<Result> {
  await requireAdmin();
  const admin = await getCurrentProfile();

  const message = input.message.trim();
  if (!message) return { success: false, error: "Le message ne peut pas être vide." };
  if (input.targetKind !== "all" && !input.targetValue) {
    return { success: false, error: "Choisis une cible." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const recipients = await resolveRecipients(adminClient, input.targetKind, input.targetValue);
  if (recipients.length === 0) {
    return { success: false, error: "Aucun destinataire ne correspond à cette cible." };
  }

  await notifyMany(recipients, "admin_message", message, input.link.trim() || undefined, {
    intrusive: input.intrusive,
    title: input.title.trim() || undefined,
    sentBy: admin?.id,
  });

  revalidatePath("/admin/notifications");
  revalidatePath("/", "layout");
  return { success: true, recipients: recipients.length };
}
