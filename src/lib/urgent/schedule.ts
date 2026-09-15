import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countSmsSegments } from "@/lib/smsSegments";
import { getSmsPlanState } from "@/lib/sms/balance";
import { floorFor } from "@/lib/sms/ladder";
import { getEmailQuota } from "@/lib/admin/data";
import {
  MAX_SMS_PER_ROUND,
  resolveContacts,
  runUrgentDelivery,
  smsText,
  type UrgentChannel,
  type UrgentChannels,
  type UrgentKind,
} from "./engine";

type Db = NonNullable<ReturnType<typeof createAdminClient>>;

export type ScheduleInput = {
  kind: UrgentKind;
  subject: string;
  message: string;
  audience: string;
  audienceLabel: string;
  recipientIds: string[];
  channels: UrgentChannels;
  createdBy: string;
  studentId?: string;
  /** Wording for "this person has no phone/email" vs "nobody in this group has one". */
  single: boolean;
};

/**
 * Checks the first round of every channel can actually go out, then records
 * the broadcast and one delivery per channel × round, and starts round 1.
 * Shared by the admin's urgent page and the teachers' convocations.
 */
export async function scheduleBroadcast(
  db: Db,
  input: ScheduleInput,
): Promise<{ ok: true; summary: string; broadcastId: string } | { ok: false; error: string }> {
  const { channels, message } = input;
  if (!channels.email.enabled && !channels.sms.enabled && !channels.notification.enabled) {
    return { ok: false, error: "Garde au moins un moyen d'envoi : notification, SMS ou email." };
  }

  const { phones, emails } = await resolveContacts(db, input.recipientIds);

  if (channels.sms.enabled) {
    if (phones.length === 0) {
      return {
        ok: false,
        error: input.single
          ? "Cette personne n'a pas de numéro de téléphone : retire le SMS."
          : "Personne n'a de numéro de téléphone dans cette sélection : retire le SMS.",
      };
    }
    const plan = await getSmsPlanState();
    const perRound =
      Math.min(phones.length, MAX_SMS_PER_ROUND) *
      countSmsSegments(smsText(input.kind, message, channels.sms.count, channels.sms.count));
    if (plan) {
      const usable = Math.max(plan.remaining - floorFor("school", plan.alertsLeft), 0);
      if (perRound > usable) {
        return {
          ok: false,
          error: `Un envoi SMS coûte ${perRound} SMS mais seuls ${usable} sont utilisables sur le forfait du collège (le reste est réservé aux codes de vérification). Retire le SMS ou réessaie après la recharge.`,
        };
      }
    }
  }

  if (channels.email.enabled) {
    if (emails.length === 0) {
      return {
        ok: false,
        error: input.single
          ? "Cette personne n'a pas d'adresse email : retire l'email."
          : "Personne n'a d'adresse email dans cette sélection : retire l'email.",
      };
    }
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
      kind: input.kind,
      subject: input.subject,
      message,
      audience: input.audience,
      audience_label: input.audienceLabel,
      recipient_ids: input.recipientIds,
      channels,
      created_by: input.createdBy,
      student_id: input.studentId ?? null,
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
  if (channels.notification.enabled) plan("notification", channels.notification.count, channels.notification.intervalMinutes);
  if (channels.sms.enabled) plan("sms", channels.sms.count, channels.sms.intervalMinutes);
  if (channels.email.enabled) plan("email", channels.email.count, channels.email.intervalMinutes);

  const { data: deliveries, error: deliveriesError } = await db.from("urgent_deliveries").insert(rows).select("id, round");
  if (deliveriesError) return { ok: false, error: deliveriesError.message };

  const firstRound = (deliveries ?? []).filter((d) => d.round === 1).map((d) => d.id);
  // All channels start together; a large SMS round keeps going after the response.
  after(async () => {
    await Promise.all(firstRound.map((id) => runUrgentDelivery(id)));
  });

  const times = (count: number) => (count > 1 ? ` × ${count}` : "");
  const parts = [
    channels.notification.enabled && `notification${times(channels.notification.count)}`,
    channels.sms.enabled && `${Math.min(phones.length, MAX_SMS_PER_ROUND)} SMS${times(channels.sms.count)}`,
    channels.email.enabled && `${emails.length} email(s)${times(channels.email.count)}`,
  ].filter(Boolean);
  return { ok: true, broadcastId: broadcast.id, summary: `Envoi lancé : ${parts.join(", ")}.` };
}

/** Stops the rounds that haven't gone out yet; what was already sent stays sent. */
export async function cancelBroadcast(db: Db, broadcastId: string) {
  await db.from("urgent_broadcasts").update({ cancelled_at: new Date().toISOString() }).eq("id", broadcastId);
  await db
    .from("urgent_deliveries")
    .update({ status: "cancelled", done_at: new Date().toISOString() })
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending");
}
