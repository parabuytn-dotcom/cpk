import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UrgentChannel, UrgentChannels } from "./engine";

export type UrgentDeliveryRow = {
  id: string;
  channel: UrgentChannel;
  round: number;
  rounds: number;
  runAt: string;
  status: "pending" | "running" | "done" | "cancelled";
  sent: number;
  failed: number;
  skipped: number;
  error: string | null;
};

export type UrgentBroadcastRow = {
  id: string;
  subject: string;
  message: string;
  audienceLabel: string;
  recipients: number;
  channels: UrgentChannels;
  createdAt: string;
  cancelledAt: string | null;
  deliveries: UrgentDeliveryRow[];
};

export async function listUrgentBroadcasts(limit = 20): Promise<UrgentBroadcastRow[]> {
  const db = createAdminClient();
  if (!db) return [];

  const { data: broadcasts } = await db
    .from("urgent_broadcasts")
    .select("id, subject, message, audience_label, recipient_ids, channels, created_at, cancelled_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!broadcasts || broadcasts.length === 0) return [];

  const { data: deliveries } = await db
    .from("urgent_deliveries")
    .select("id, broadcast_id, channel, round, rounds, run_at, status, sent, failed, skipped, error")
    .in("broadcast_id", broadcasts.map((b) => b.id))
    .order("run_at");

  return broadcasts.map((b) => ({
    id: b.id,
    subject: b.subject,
    message: b.message,
    audienceLabel: b.audience_label,
    recipients: b.recipient_ids.length,
    channels: b.channels as UrgentChannels,
    createdAt: b.created_at,
    cancelledAt: b.cancelled_at,
    deliveries: (deliveries ?? [])
      .filter((d) => d.broadcast_id === b.id)
      .map((d) => ({
        id: d.id,
        channel: d.channel as UrgentChannel,
        round: d.round,
        rounds: d.rounds,
        runAt: d.run_at,
        status: d.status as UrgentDeliveryRow["status"],
        sent: d.sent,
        failed: d.failed,
        skipped: d.skipped,
        error: d.error,
      })),
  }));
}
