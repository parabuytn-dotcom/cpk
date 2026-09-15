"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { countSmsSegments } from "@/lib/smsSegments";
import { getSmsPlanState } from "@/lib/sms/balance";
import { floorFor } from "@/lib/sms/ladder";
import { getEmailQuota } from "@/lib/admin/data";
import {
  MAX_SMS_PER_ROUND,
  resolveAudience,
  resolveContacts,
  runUrgentDelivery,
  type UrgentChannel,
  type UrgentChannels,
} from "@/lib/urgent/engine";

const audienceSchema = z.object({
  audience: z.enum(["all", "parents", "teachers", "students", "class"]),
  classId: z.string().uuid().optional(),
});

export type UrgentPreview =
  | {
      ok: true;
      people: number;
      phones: number;
      emails: number;
      smsUsable: number | null;
      emailRemaining: number;
    }
  | { ok: false; error: string };

/** Who a broadcast would reach, and what's left to reach them with. */
export async function previewUrgent(input: { audience: string; classId?: string }): Promise<UrgentPreview> {
  await requireAdmin();
  const parsed = audienceSchema.safeParse({ audience: input.audience, classId: input.classId || undefined });
  if (!parsed.success) return { ok: false, error: "Destinataires invalides." };
  const db = createAdminClient();
  if (!db) return { ok: false, error: "Supabase (clé service_role) n'est pas configuré." };

  const { ids } = await resolveAudience(db, parsed.data.audience, parsed.data.classId);
  const [{ phones, emails }, plan, quota] = await Promise.all([
    resolveContacts(db, ids),
    getSmsPlanState(),
    getEmailQuota(),
  ]);
  return {
    ok: true,
    people: ids.length,
    phones: phones.length,
    emails: emails.length,
    smsUsable: plan ? Math.max(plan.remaining - floorFor("school", plan.alertsLeft), 0) : null,
    emailRemaining: quota.remaining,
  };
}

const sendSchema = audienceSchema.extend({
  subject: z.string().trim().min(1, "Donne un titre au message.").max(120, "Titre trop long."),
  message: z.string().trim().min(1, "Message vide.").max(1000, "Message trop long."),
  channels: z.object({
    email: z.object({ enabled: z.boolean() }),
    sms: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(10),
      intervalMinutes: z.number().int().min(5).max(1440),
    }),
    notification: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(12),
      intervalMinutes: z.number().int().min(5).max(1440),
      intrusive: z.boolean(),
    }),
  }),
});

export type UrgentSendInput = z.input<typeof sendSchema>;

export async function sendUrgent(input: UrgentSendInput): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const parsed = sendSchema.safeParse({ ...input, classId: input.classId || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { audience, classId, subject, message, channels } = parsed.data;

  if (!channels.email.enabled && !channels.sms.enabled && !channels.notification.enabled) {
    return { ok: false, error: "Garde au moins un moyen d'envoi : email, SMS ou notification." };
  }
  if (audience === "class" && !classId) return { ok: false, error: "Choisis une classe." };

  const db = createAdminClient();
  if (!db) return { ok: false, error: "Supabase (clé service_role) n'est pas configuré." };

  const { ids, label } = await resolveAudience(db, audience, classId);
  if (ids.length === 0) return { ok: false, error: "Aucun membre du site ne correspond à ces destinataires." };

  const { phones, emails } = await resolveContacts(db, ids);

  // Refuse up front rather than discover half-way that the first round can't go out.
  if (channels.sms.enabled) {
    if (phones.length === 0) return { ok: false, error: "Personne n'a de numéro de téléphone dans cette sélection : retire le SMS." };
    const plan = await getSmsPlanState();
    const perRound = Math.min(phones.length, MAX_SMS_PER_ROUND) * countSmsSegments(`CPK Learn - URGENT (rappel 10/10) : ${message}`);
    if (plan) {
      const usable = Math.max(plan.remaining - floorFor("school", plan.alertsLeft), 0);
      if (perRound > usable) {
        return {
          ok: false,
          error: `Un envoi SMS coûte ${perRound} SMS mais seuls ${usable} sont utilisables (le reste est réservé aux codes de vérification et aux alertes de recharge). Recharge, ou retire le SMS.`,
        };
      }
    }
  }
  if (channels.email.enabled) {
    if (emails.length === 0) return { ok: false, error: "Personne n'a d'adresse email dans cette sélection : retire l'email." };
    const quota = await getEmailQuota();
    if (emails.length > quota.remaining) {
      return {
        ok: false,
        error: `${emails.length} emails à envoyer, mais il n'en reste que ${quota.remaining} aujourd'hui. Retire l'email ou restreins les destinataires.`,
      };
    }
  }

  const { data: broadcast, error } = await db
    .from("urgent_broadcasts")
    .insert({
      subject,
      message,
      audience,
      audience_label: label,
      recipient_ids: ids,
      channels: channels satisfies UrgentChannels,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (error || !broadcast) return { ok: false, error: error?.message ?? "Enregistrement impossible." };

  const now = Date.now();
  const rows: { broadcast_id: string; channel: UrgentChannel; round: number; rounds: number; run_at: string }[] = [];
  const plan = (channel: UrgentChannel, count: number, intervalMinutes: number) => {
    for (let round = 1; round <= count; round++) {
      rows.push({
        broadcast_id: broadcast.id,
        channel,
        round,
        rounds: count,
        run_at: new Date(now + (round - 1) * intervalMinutes * 60_000).toISOString(),
      });
    }
  };
  if (channels.email.enabled) plan("email", 1, 0);
  if (channels.sms.enabled) plan("sms", channels.sms.count, channels.sms.intervalMinutes);
  if (channels.notification.enabled) plan("notification", channels.notification.count, channels.notification.intervalMinutes);

  const { data: deliveries, error: deliveriesError } = await db
    .from("urgent_deliveries")
    .insert(rows)
    .select("id, round");
  if (deliveriesError) return { ok: false, error: deliveriesError.message };

  const firstRound = (deliveries ?? []).filter((d) => d.round === 1).map((d) => d.id);
  // All channels start together; a large SMS round keeps going after the response.
  after(async () => {
    await Promise.all(firstRound.map((id) => runUrgentDelivery(id)));
  });

  revalidatePath("/admin/urgent");
  const parts = [
    channels.notification.enabled && `${ids.length} notification(s)${channels.notification.count > 1 ? ` × ${channels.notification.count}` : ""}`,
    channels.sms.enabled && `${Math.min(phones.length, MAX_SMS_PER_ROUND)} SMS${channels.sms.count > 1 ? ` × ${channels.sms.count}` : ""}`,
    channels.email.enabled && `${emails.length} email(s)`,
  ].filter(Boolean);
  return { ok: true, summary: `Envoi lancé : ${parts.join(", ")}.` };
}

/** Stops the rounds that haven't gone out yet; what was already sent stays sent. */
export async function cancelUrgent(broadcastId: string) {
  await requireAdmin();
  const db = createAdminClient();
  if (!db) return;
  await db.from("urgent_broadcasts").update({ cancelled_at: new Date().toISOString() }).eq("id", broadcastId);
  await db
    .from("urgent_deliveries")
    .update({ status: "cancelled", done_at: new Date().toISOString() })
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending");
  revalidatePath("/admin/urgent");
}
