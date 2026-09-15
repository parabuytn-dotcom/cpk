import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSmsPlanState, type SmsPlanState } from "./balance";
import { KIND_PRIORITY, type QueueKind } from "./ladder";

export type QueuedSms = {
  id: string;
  kind: QueueKind;
  phone: string;
  message: string;
  segments: number;
  remindersSent: number;
  createdAt: string;
  expiresAt: string | null;
  error: string | null;
};

export type SmsLadderStatus = { plan: SmsPlanState | null; pending: QueuedSms[]; pendingCost: number };

export async function getSmsLadderStatus(): Promise<SmsLadderStatus> {
  const db = createAdminClient();
  const [plan, queue] = await Promise.all([
    getSmsPlanState(),
    db?.from("sms_queue").select("*").eq("status", "pending").limit(500),
  ]);

  const pending: QueuedSms[] = (queue?.data ?? [])
    .map((row) => ({
      id: row.id,
      kind: row.kind as QueueKind,
      phone: row.phone,
      message: row.message,
      segments: row.segments,
      remindersSent: row.reminders_sent,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      error: row.error,
    }))
    .sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || a.createdAt.localeCompare(b.createdAt));

  return { plan, pending, pendingCost: pending.reduce((sum, item) => sum + item.segments, 0) };
}
