// The SMS priority ladder, as pure rules (no I/O) so it can be reasoned about
// and tested on its own. Once fewer than LOW_BALANCE_THRESHOLD SMS remain on
// the plan, each kind of message may only spend down to its own floor:
//
//   1. verification codes  — may use every last SMS; the 30 below everyone
//                            else's floor are theirs alone
//   2. recharge alerts     — 10 texts to the admin, 20 min apart, above those 30
//   3. school messages     — makeup sessions first, then absences (and manual
//                            or account-access texts), above the alerts' share
//
// School messages that hit their floor wait in sms_queue (see schoolSms.ts).

import type { SmsTrigger } from "@/lib/smsService";

export const LOW_BALANCE_THRESHOLD = 100;
export const CODE_RESERVE = 30;
export const RECHARGE_ALERT_COUNT = 10;
export const RECHARGE_ALERT_INTERVAL_MS = 20 * 60 * 1000;
export const REMINDER_INTERVAL_MS = 30 * 60 * 1000;
export const REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000;
/** 6 hours, one every 30 minutes; the first one is the intrusive notification. */
export const REMINDER_COUNT = REMINDER_WINDOW_MS / REMINDER_INTERVAL_MS;

export const RECHARGE_ALERT_PREFIX = "CPK Learn - ALERTE SMS";
export const PENDING_NOTICE_PREFIX = "CPK Learn - SMS EN ATTENTE";

export type SmsTier = "code" | "alert" | "school";

export function tierOf(trigger: SmsTrigger): SmsTier {
  if (trigger === "phone_verification") return "code";
  if (trigger === "low_balance_alert") return "alert";
  return "school";
}

/** Lowest balance this tier may leave behind. */
export function floorFor(tier: SmsTier, alertsLeft: number) {
  if (tier === "code") return 0;
  if (tier === "alert") return CODE_RESERVE;
  return CODE_RESERVE + Math.max(alertsLeft, 0);
}

/**
 * Whether a send of `cost` SMS is allowed. `remaining` is null while no plan
 * balance has been entered: nothing to measure against, so nothing is held.
 * Codes are never held back, even at zero: the tracked balance can drift from
 * the carrier's, and a login code that doesn't arrive locks someone out.
 */
export function canSpend(tier: SmsTier, remaining: number | null, cost: number, alertsLeft: number) {
  if (remaining === null || tier === "code") return true;
  return remaining - cost >= floorFor(tier, alertsLeft);
}

export type QueueDecision =
  | { action: "send-all" }
  | { action: "send-within-floor" }
  | { action: "hold"; missing: number };

/**
 * What to do with the queued school SMS. Above the threshold, they only go out
 * if the plan still keeps 100 SMS afterwards; otherwise the admin is told how
 * many to buy (or forces the send). Below it, they go out in priority order
 * down to the school floor.
 */
export function decideQueue(remaining: number | null, pendingCost: number, force: boolean): QueueDecision {
  if (remaining === null) return { action: "send-all" };
  if (force || remaining < LOW_BALANCE_THRESHOLD) return { action: "send-within-floor" };
  if (remaining - pendingCost >= LOW_BALANCE_THRESHOLD) return { action: "send-all" };
  return { action: "hold", missing: pendingCost + LOW_BALANCE_THRESHOLD - remaining };
}

export const KIND_PRIORITY = { makeup_session: 0, teacher_absence: 1 } as const;
export type QueueKind = keyof typeof KIND_PRIORITY;
