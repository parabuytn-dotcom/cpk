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
  kind: "urgent" | "convocation";
  /** Name of whoever sent it, for convocations sent by teachers. */
  senderName: string | null;
  subject: string;
  message: string;
  audienceLabel: string;
  recipients: number;
  channels: UrgentChannels;
  createdAt: string;
  cancelledAt: string | null;
  deliveries: UrgentDeliveryRow[];
};

export async function listUrgentBroadcasts({
  limit = 20,
  createdBy,
  kind,
}: { limit?: number; createdBy?: string; kind?: "urgent" | "convocation" } = {}): Promise<UrgentBroadcastRow[]> {
  const db = createAdminClient();
  if (!db) return [];

  let query = db
    .from("urgent_broadcasts")
    .select("id, kind, subject, message, audience_label, recipient_ids, channels, created_at, cancelled_at, created_by")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (createdBy) query = query.eq("created_by", createdBy);
  if (kind) query = query.eq("kind", kind);
  const { data: broadcasts } = await query;
  if (!broadcasts || broadcasts.length === 0) return [];

  const { data: deliveries } = await db
    .from("urgent_deliveries")
    .select("id, broadcast_id, channel, round, rounds, run_at, status, sent, failed, skipped, error")
    .in("broadcast_id", broadcasts.map((b) => b.id))
    .order("run_at");

  const senderIds = Array.from(new Set(broadcasts.map((b) => b.created_by).filter((id): id is string => Boolean(id))));
  const { data: senders } = senderIds.length
    ? await db.from("profiles").select("id, full_name, parent_first_name, parent_last_name").in("id", senderIds)
    : { data: [] };
  const senderName = new Map(
    (senders ?? []).map((p) => [p.id, p.full_name ?? ([p.parent_first_name, p.parent_last_name].filter(Boolean).join(" ") || null)]),
  );

  return broadcasts.map((b) => ({
    id: b.id,
    kind: (b.kind ?? "urgent") as "urgent" | "convocation",
    senderName: b.created_by ? (senderName.get(b.created_by) ?? null) : null,
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
