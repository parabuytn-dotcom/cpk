"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { sendSms } from "@/lib/smsService";

export type SmsSendResult =
  | { success: true; sent: number; failed: number; skipped: number; lastError: string | null }
  | { success: false; error: string };

const schema = z.object({
  audience: z.enum(["all", "parents", "teachers", "students", "class", "tag", "manual"]),
  classId: z.string().optional().or(z.literal("")),
  tag: z.string().trim().optional().or(z.literal("")),
  extraPhones: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().min(1, "Message vide.").max(1000, "Message trop long."),
});

const PHONE_RE = /^\d{8}$/;

// Sent one by one through the school's own SIM (not a bulk-messaging
// business line) — a carrier can flag or suspend a personal SIM that
// suddenly blasts hundreds of texts, so a send is capped well under that.
const MAX_PER_SEND = 150;

export async function sendBulkSms(formData: FormData): Promise<SmsSendResult> {
  await requireAdmin();

  const validated = schema.safeParse({
    audience: formData.get("audience"),
    classId: formData.get("classId") ?? "",
    tag: formData.get("tag") ?? "",
    extraPhones: formData.get("extraPhones") ?? "",
    message: formData.get("message"),
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { audience, classId, tag, extraPhones, message } = validated.data;
  const recipients = new Set<string>();
  let skipped = 0;

  // 1. Phone numbers typed by hand.
  for (const raw of (extraPhones ?? "").split(/[\s,;]+/)) {
    const phone = raw.trim();
    if (!phone) continue;
    if (PHONE_RE.test(phone)) recipients.add(phone);
    else skipped++;
  }

  // 2. Site members matching the chosen audience.
  if (audience !== "manual") {
    let query = adminClient.from("profiles").select("id, role, tags, phone");

    if (audience === "parents") query = query.eq("role", "parent");
    else if (audience === "teachers") query = query.eq("role", "teacher");
    else if (audience === "students") query = query.eq("role", "student");
    else if (audience === "tag" && tag) query = query.contains("tags", [tag]);

    const { data: profiles, error } = await query;
    if (error) return { success: false, error: error.message };

    let targets = profiles ?? [];

    if (audience === "class" && classId) {
      const { data: students } = await adminClient
        .from("students")
        .select("user_id, parent_id")
        .eq("class_id", classId);
      const classMemberIds = new Set(
        (students ?? []).flatMap((s) => [s.user_id, s.parent_id]).filter(Boolean) as string[],
      );
      targets = targets.filter((p) => classMemberIds.has(p.id));
    }

    for (const profile of targets) {
      if (profile.phone && PHONE_RE.test(profile.phone)) recipients.add(profile.phone);
      else skipped++;
    }
  }

  const list = Array.from(recipients);
  if (list.length === 0) {
    return { success: false, error: "Aucun destinataire joignable par SMS dans cette sélection." };
  }
  if (list.length > MAX_PER_SEND) {
    return {
      success: false,
      error: `${list.length} destinataires : au-dessus de la limite de ${MAX_PER_SEND} par envoi, pour protéger la carte SIM du collège d'un blocage anti-spam de l'opérateur. Restreins la sélection.`,
    };
  }

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;

  // sendSms() already logs each attempt to sms_logs itself, so nothing extra
  // to persist here beyond the send loop.
  for (const phone of list) {
    const result = await sendSms(phone, message, "manual");
    if (result.success) sent++;
    else {
      failed++;
      lastError = result.error;
    }
  }

  revalidatePath("/admin/sms");
  return { success: true, sent, failed, skipped, lastError };
}
