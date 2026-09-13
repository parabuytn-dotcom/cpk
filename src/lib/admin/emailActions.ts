"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { getCurrentProfile } from "@/lib/auth/session";
import { sendEmail } from "@/lib/emailService";
import { renderEmail, plainTextToHtml } from "@/lib/emailTemplate";
import { getEmailQuota } from "@/lib/admin/data";

export type EmailSendResult =
  | { success: true; sent: number; failed: number; skipped: number; lastError: string | null }
  | { success: false; error: string };

const schema = z.object({
  audience: z.enum(["all", "parents", "teachers", "students", "class", "tag", "manual"]),
  classId: z.string().optional().or(z.literal("")),
  tag: z.string().trim().optional().or(z.literal("")),
  extraEmails: z.string().trim().optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Objet requis.").max(200, "Objet trop long."),
  body: z.string().trim().min(1, "Message vide.").max(10000, "Message trop long."),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export async function sendBulkEmail(formData: FormData): Promise<EmailSendResult> {
  await requireAdmin();
  const admin = await getCurrentProfile();

  const validated = schema.safeParse({
    audience: formData.get("audience"),
    classId: formData.get("classId") ?? "",
    tag: formData.get("tag") ?? "",
    extraEmails: formData.get("extraEmails") ?? "",
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { audience, classId, tag, extraEmails, subject, body } = validated.data;
  const recipients = new Set<string>();
  let skipped = 0;

  // 1. External addresses typed by hand.
  for (const raw of (extraEmails ?? "").split(/[\s,;]+/)) {
    const address = raw.trim().toLowerCase();
    if (!address) continue;
    if (EMAIL_RE.test(address)) recipients.add(address);
    else skipped++;
  }

  // 2. Site members matching the chosen audience.
  if (audience !== "manual") {
    let query = adminClient.from("profiles").select("id, role, tags, contact_email");

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
      // A class mail goes to the pupils who have an account AND their parents.
      const classMemberIds = new Set(
        (students ?? []).flatMap((s) => [s.user_id, s.parent_id]).filter(Boolean) as string[],
      );
      targets = targets.filter((p) => classMemberIds.has(p.id));
    }

    for (const profile of targets) {
      // A declared contact_email always wins; otherwise fall back to the auth
      // address, which is only usable when it's a real one (phone-registered
      // accounts get a synthetic @cpk.internal address that goes nowhere).
      if (profile.contact_email && EMAIL_RE.test(profile.contact_email)) {
        recipients.add(profile.contact_email.toLowerCase());
        continue;
      }
      const { data: userData } = await adminClient.auth.admin.getUserById(profile.id);
      const authEmail = userData.user?.email ?? "";
      if (authEmail && !authEmail.endsWith("@cpk.internal") && EMAIL_RE.test(authEmail)) {
        recipients.add(authEmail.toLowerCase());
      } else {
        skipped++;
      }
    }
  }

  const list = Array.from(recipients);
  if (list.length === 0) {
    return { success: false, error: "Aucun destinataire joignable par email dans cette sélection." };
  }
  // Refuse rather than send half the batch and hit Brevo's daily wall mid-way.
  const quota = await getEmailQuota();
  if (list.length > quota.remaining) {
    return {
      success: false,
      error: `${list.length} destinataires, mais il ne reste que ${quota.remaining} emails aujourd'hui sur ${quota.total} (le quota Brevo repart à zéro à minuit UTC). Restreins la sélection ou attends demain.`,
    };
  }

  const html = renderEmail({ title: subject, bodyHtml: plainTextToHtml(body) });

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const recipient of list) {
    const result = await sendEmail(recipient, subject, html, {
      sentBy: admin?.id ?? null,
      logBody: body,
    });
    if (result.success) {
      sent++;
    } else {
      failed++;
      lastError = result.error;
    }
  }

  revalidatePath("/admin/emails");
  return { success: true, sent, failed, skipped, lastError };
}
