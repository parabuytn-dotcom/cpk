import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/smsService";
import { countSmsSegments } from "@/lib/smsSegments";
import { notify, notifyMany } from "@/lib/notifications/engine";
import { SITE_URL } from "@/lib/siteUrl";
import { DEFAULT_ADMIN_VERIFICATION_PHONE } from "@/lib/admin/adminProof";
import { getSmsPlanState } from "./balance";
import {
  KIND_PRIORITY,
  LOW_BALANCE_THRESHOLD,
  PENDING_NOTICE_PREFIX,
  RECHARGE_ALERT_COUNT,
  RECHARGE_ALERT_INTERVAL_MS,
  RECHARGE_ALERT_PREFIX,
  REMINDER_COUNT,
  REMINDER_INTERVAL_MS,
  REMINDER_WINDOW_MS,
  canSpend,
  decideQueue,
  type QueueKind,
} from "./ladder";

const MAX_ATTEMPTS = 3;
/** Cron ticks every 5 min; a little slack keeps a 30-min reminder from slipping to 35. */
const TICK_SLACK_MS = 90 * 1000;

export type SchoolSms = {
  kind: QueueKind;
  /** The absence or makeup session this is about, so deleting it can cancel the text. */
  sourceId: string;
  phone: string;
  message: string;
  /** Everyone reached through this number (often a parent and their child). */
  recipientIds: string[];
  /** Past this, the message is pointless (the absence or session is over). */
  expiresAt: Date;
};

type QueueRow = {
  id: string;
  kind: QueueKind;
  phone: string;
  message: string;
  segments: number;
  recipient_ids: string[];
  expires_at: string | null;
  intrusive_sent: boolean;
  reminders_sent: number;
  attempts: number;
  last_reminder_at: string | null;
  created_at: string;
};

function byPriority(a: { kind: QueueKind; created_at?: string }, b: { kind: QueueKind; created_at?: string }) {
  return KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

async function adminPhone() {
  const db = createAdminClient();
  const { data } = (await db?.from("site_settings").select("value").eq("key", "admin_verification_phone").maybeSingle()) ?? {};
  return data?.value && /^\d{8}$/.test(data.value) ? data.value : DEFAULT_ADMIN_VERIFICATION_PHONE;
}

/**
 * Sends absence / makeup texts, or queues the ones the ladder holds back.
 * A text also waits when an older one of equal or higher priority is still
 * queued, so a fresh absence can't jump ahead of a waiting makeup session.
 */
export async function sendOrQueueSchoolSms(items: SchoolSms[]) {
  const db = createAdminClient();
  if (!db || items.length === 0) return { sent: 0, queued: 0 };

  const { data: waiting } = await db.from("sms_queue").select("kind").eq("status", "pending");
  const waitingKinds = new Set((waiting ?? []).map((row) => row.kind as QueueKind));

  let sent = 0;
  const toQueue: SchoolSms[] = [];

  // Plenty left and nothing waiting: no order to protect, so send five at a
  // time instead of one by one (a whole grade would otherwise take minutes).
  const plan = await getSmsPlanState();
  const totalCost = items.reduce((sum, item) => sum + countSmsSegments(item.message), 0);
  if (waitingKinds.size === 0 && (!plan || plan.remaining - totalCost >= LOW_BALANCE_THRESHOLD)) {
    for (let i = 0; i < items.length; i += 5) {
      const results = await Promise.all(
        items.slice(i, i + 5).map((item) => sendSms(item.phone, item.message, item.kind)),
      );
      sent += results.filter((r) => r.success).length;
    }
    await sendRechargeAlertIfDue();
    return { sent, queued: 0 };
  }

  for (const item of [...items].sort(byPriority)) {
    const blockedByOlder = Array.from(waitingKinds).some(
      (kind) => KIND_PRIORITY[kind] <= KIND_PRIORITY[item.kind],
    );
    if (blockedByOlder) {
      toQueue.push(item);
      continue;
    }
    const result = await sendSms(item.phone, item.message, item.kind);
    if (result.success) sent++;
    else if (result.heldByLadder) {
      toQueue.push(item);
      // Everything behind it waits too, in order.
      waitingKinds.add(item.kind);
    }
  }

  if (toQueue.length > 0) {
    await db.from("sms_queue").insert(
      toQueue.map((item) => ({
        kind: item.kind,
        source_id: item.sourceId,
        phone: item.phone,
        message: item.message,
        segments: countSmsSegments(item.message),
        recipient_ids: item.recipientIds,
        expires_at: item.expiresAt.toISOString(),
      })),
    );
    // Families shouldn't wait 5 minutes for the cron to learn their text is stuck.
    await sendDueReminders();
  }

  await sendRechargeAlertIfDue();
  return { sent, queued: toQueue.length };
}

/** Cancels queued texts about an absence or makeup session that was deleted. */
export async function cancelQueuedSchoolSms(sourceId: string) {
  await createAdminClient()
    ?.from("sms_queue")
    .update({ status: "expired", error: "Supprimé avant l'envoi." })
    .eq("source_id", sourceId)
    .eq("status", "pending");
}

async function expireStaleItems() {
  await createAdminClient()
    ?.from("sms_queue")
    .update({ status: "expired", error: "Expiré : l'évènement est passé." })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
}

async function pendingItems(): Promise<QueueRow[]> {
  const { data } = (await createAdminClient()?.from("sms_queue").select("*").eq("status", "pending")) ?? {};
  return ((data ?? []) as QueueRow[]).sort(byPriority);
}

/**
 * Sends what the queue can afford. `force` is the admin's "send anyway"
 * after a recharge that doesn't cover the queue plus a 100-SMS cushion: it
 * spends down to the school floor, never into the codes' and alerts' share.
 */
export async function dispatchSmsQueue({ force = false } = {}) {
  const db = createAdminClient();
  if (!db) return { sent: 0, held: 0, missing: 0 };

  await expireStaleItems();
  const items = await pendingItems();
  if (items.length === 0) return { sent: 0, held: 0, missing: 0 };

  const plan = await getSmsPlanState();
  const pendingCost = items.reduce((sum, item) => sum + item.segments, 0);
  const decision = decideQueue(plan?.remaining ?? null, pendingCost, force);

  if (decision.action === "hold") {
    await sendPendingNoticeIfDue(items.length, pendingCost, decision.missing);
    return { sent: 0, held: items.length, missing: decision.missing };
  }

  let remaining = plan?.remaining ?? null;
  let sent = 0;
  for (const item of items) {
    if (
      decision.action === "send-within-floor" &&
      !canSpend("school", remaining, item.segments, plan?.alertsLeft ?? RECHARGE_ALERT_COUNT)
    ) {
      break; // strict order: nothing behind a held makeup session goes first
    }
    const result = await sendSms(item.phone, item.message, item.kind);
    if (result.success) {
      sent++;
      if (remaining !== null) remaining -= item.segments;
      await db.from("sms_queue").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", item.id);
    } else if (result.heldByLadder) {
      break;
    } else {
      const attempts = item.attempts + 1;
      await db
        .from("sms_queue")
        .update({ attempts, error: result.error, status: attempts >= MAX_ATTEMPTS ? "failed" : "pending" })
        .eq("id", item.id);
    }
  }

  return { sent, held: items.length - sent, missing: 0 };
}

/**
 * Families whose text is stuck get it as notifications instead: the first is
 * intrusive (a blocking modal on their next visit), then one every 30 minutes
 * for 6 hours, until the SMS finally goes out or the event is over.
 */
export async function sendDueReminders() {
  const db = createAdminClient();
  if (!db) return 0;

  const now = Date.now();
  const items = (await pendingItems()).filter(
    (item) =>
      item.recipient_ids.length > 0 &&
      item.reminders_sent < REMINDER_COUNT &&
      now - new Date(item.created_at).getTime() < REMINDER_WINDOW_MS &&
      (!item.last_reminder_at || now - new Date(item.last_reminder_at).getTime() >= REMINDER_INTERVAL_MS - TICK_SLACK_MS),
  );

  for (const item of items) {
    if (!item.intrusive_sent) {
      await Promise.all(
        item.recipient_ids.map((id) =>
          notify(id, "sms_fallback", item.message, "/emploi-du-temps", {
            intrusive: true,
            title: "Information importante",
          }),
        ),
      );
    } else {
      await notifyMany(
        item.recipient_ids,
        "sms_fallback",
        `Rappel (${item.reminders_sent + 1}/${REMINDER_COUNT}) : ${item.message}`,
        "/emploi-du-temps",
      );
    }
    await db
      .from("sms_queue")
      .update({
        intrusive_sent: true,
        reminders_sent: item.reminders_sent + 1,
        last_reminder_at: new Date().toISOString(),
      })
      .eq("id", item.id);
  }
  return items.length;
}

/** Up to 10 texts to the admin's phone, 20 minutes apart, while under 100 SMS. */
export async function sendRechargeAlertIfDue() {
  const plan = await getSmsPlanState();
  if (!plan || plan.remaining >= LOW_BALANCE_THRESHOLD || plan.alertsLeft <= 0) return false;
  if (plan.lastAlertAt && Date.now() - new Date(plan.lastAlertAt).getTime() < RECHARGE_ALERT_INTERVAL_MS - TICK_SLACK_MS) {
    return false;
  }

  const number = RECHARGE_ALERT_COUNT - plan.alertsLeft + 1;
  const message = `${RECHARGE_ALERT_PREFIX} ${number}/${RECHARGE_ALERT_COUNT} : il ne reste que ${plan.remaining} SMS sur le forfait du college. Rechargez puis mettez le solde a jour : ${SITE_URL}/admin/sms`;
  await sendSms(await adminPhone(), message, "low_balance_alert");
  return true;
}

/** Once per recharge: how many SMS are missing to send the queue and keep 100. */
async function sendPendingNoticeIfDue(count: number, cost: number, missing: number) {
  const db = createAdminClient();
  const plan = await getSmsPlanState();
  if (!db || !plan) return;

  const { count: already } = await db
    .from("sms_logs")
    .select("id", { count: "exact", head: true })
    .eq("trigger", "low_balance_alert")
    .like("message", `${PENDING_NOTICE_PREFIX}%`)
    .gte("created_at", plan.setAt);
  if ((already ?? 0) > 0) return;

  const message = `${PENDING_NOTICE_PREFIX} : ${count} SMS d'absences/rattrapages attendent (${cost} SMS). Il en manque ${missing} pour les envoyer en gardant 100 SMS. Forcer l'envoi : ${SITE_URL}/admin/sms?forcer=1`;
  await sendSms(await adminPhone(), message, "low_balance_alert");
}

/** One pass of everything time-based; run every 5 minutes by the database cron. */
export async function runSmsPriorityTick() {
  const dispatched = await dispatchSmsQueue();
  const reminders = await sendDueReminders();
  const alert = await sendRechargeAlertIfDue();
  return { ...dispatched, reminders, alert };
}
