import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECHARGE_ALERT_COUNT, RECHARGE_ALERT_PREFIX } from "./ladder";

export type SmsPlanState = {
  /** SMS entered at the last recharge. */
  total: number;
  /** When that balance was entered; only sends from then on count against it. */
  setAt: string;
  used: number;
  remaining: number;
  /** Recharge alerts still to come for this recharge period (out of 10). */
  alertsLeft: number;
  lastAlertAt: string | null;
};

/**
 * The plan balance as the ladder sees it. Reads with the service-role client:
 * it runs from the cron and from other people's sessions (a parent asking for
 * a code), where RLS would hide sms_logs and read the balance as untouched.
 * Null while no balance has been entered.
 */
export async function getSmsPlanState(): Promise<SmsPlanState | null> {
  const db = createAdminClient();
  if (!db) return null;

  const { data: settings } = await db
    .from("site_settings")
    .select("key, value")
    .in("key", ["sms_balance", "sms_balance_set_at"]);
  const byKey = new Map((settings ?? []).map((row) => [row.key, row.value]));
  const total = Number(byKey.get("sms_balance"));
  const setAt = byKey.get("sms_balance_set_at");
  if (byKey.get("sms_balance") == null || !Number.isFinite(total) || !setAt) return null;

  const [{ data: used }, { data: alerts }] = await Promise.all([
    db.rpc("sms_segments_sent_since", { since: setAt }),
    // Attempts count too, failed or not: the 20-minute spacing and the cap of
    // 10 must hold even while the gateway phone is offline.
    db
      .from("sms_logs")
      .select("created_at")
      .eq("trigger", "low_balance_alert")
      .like("message", `${RECHARGE_ALERT_PREFIX}%`)
      .gte("created_at", setAt)
      .order("created_at", { ascending: false }),
  ]);

  const usedCount = Number(used ?? 0);
  return {
    total,
    setAt,
    used: usedCount,
    remaining: Math.max(total - usedCount, 0),
    alertsLeft: Math.max(RECHARGE_ALERT_COUNT - (alerts?.length ?? 0), 0),
    lastAlertAt: alerts?.[0]?.created_at ?? null,
  };
}
