import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { countSmsSegments } from "@/lib/smsSegments";
import { getSmsPlanState } from "@/lib/sms/balance";
import { RECHARGE_ALERT_COUNT, canSpend, tierOf } from "@/lib/sms/ladder";

export type SmsTrigger =
  | "teacher_absence"
  | "generated_password"
  | "manual"
  | "phone_verification"
  | "makeup_session"
  | "low_balance_alert";

export type SendSmsResult =
  | { success: true }
  /** heldByLadder: not sent because the remaining SMS are reserved for a higher priority. */
  | { success: false; error: string; heldByLadder?: boolean };

const DEFAULT_GATEWAY_URL = "https://api.sms-gate.app/3rdparty/v1/messages";
const COUNTRY_CODE = "216";

function toInternational(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Already international (e.g. replying to a foreign number from the inbox):
  // keep its own country code rather than prefixing Tunisia's.
  if (phone.trim().startsWith("+")) return `+${digits}`;
  const withCountryCode = digits.startsWith(COUNTRY_CODE) ? digits : `${COUNTRY_CODE}${digits}`;
  // The gateway's API rejects numbers without a leading "+" as "invalid phone
  // number" (confirmed by a live test send) — every SMS sent before this fix
  // would have failed at the gateway, regardless of the credentials being valid.
  return `+${withCountryCode}`;
}

/**
 * Sends an SMS through "SMS Gateway for Android" (capcom6) running in Cloud
 * mode on the school's phone — POST https://api.sms-gate.app/3rdparty/v1/messages
 * with HTTP Basic auth (the Username/Password shown in the app's Settings
 * tab), and logs the attempt in `sms_logs`. The physical phone/SIM is
 * operated outside of this codebase; SMS_GATEWAY_URL only needs overriding
 * if the school ever self-hosts its own relay instead of the public one.
 */
export async function sendSms(
  phone: string,
  message: string,
  trigger: SmsTrigger = "manual",
): Promise<SendSmsResult> {
  const gatewayUrl = process.env.SMS_GATEWAY_URL || DEFAULT_GATEWAY_URL;
  const username = process.env.SMS_GATEWAY_USERNAME;
  const password = process.env.SMS_GATEWAY_PASSWORD;
  const segments = countSmsSegments(message);

  // Priority ladder (lib/sms/ladder.ts): below 100 SMS left, each kind of
  // message may only spend down to its own floor.
  const plan = await getSmsPlanState();
  if (!canSpend(tierOf(trigger), plan?.remaining ?? null, segments, plan?.alertsLeft ?? RECHARGE_ALERT_COUNT)) {
    const held: SendSmsResult = {
      success: false,
      heldByLadder: true,
      error: `Retenu : il ne reste que ${plan?.remaining} SMS sur le forfait, réservés aux messages plus prioritaires.`,
    };
    await logSmsAttempt(phone, message, trigger, held, segments);
    return held;
  }

  let result: SendSmsResult;

  if (!username || !password) {
    result = { success: false, error: "SMS_GATEWAY_USERNAME/PASSWORD is not configured." };
  } else {
    try {
      const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        },
        body: JSON.stringify({
          textMessage: { text: message },
          phoneNumbers: [toInternational(phone)],
        }),
      });

      if (response.ok) {
        result = { success: true };
      } else {
        const body = await response.text();
        result = { success: false, error: `Gateway responded with ${response.status}: ${body}` };
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown gateway error",
      };
    }
  }

  await logSmsAttempt(phone, message, trigger, result, segments);

  return result;
}

async function logSmsAttempt(
  phone: string,
  message: string,
  trigger: SmsTrigger,
  result: SendSmsResult,
  segments: number,
) {
  // Service role: logs are what the balance is computed from, so they must not
  // be writable by visitors (no insert policy on sms_logs).
  const db = createAdminClient() ?? (await createClient());
  await db.from("sms_logs").insert({
    phone,
    message,
    trigger,
    segments,
    status: result.success ? "sent" : "failed",
    error: result.success ? null : result.error,
  });
}

// ---------------------------------------------------------------------------
// Gateway management API — used to point the phone's "SMS received" webhook at
// the site, so incoming texts land in the admin inbox.
// ---------------------------------------------------------------------------

function gatewayApiBase() {
  const messagesUrl = process.env.SMS_GATEWAY_URL || DEFAULT_GATEWAY_URL;
  return messagesUrl.replace(/\/messages\/?$/, "");
}

export async function gatewayRequest(path: string, init: RequestInit = {}) {
  const username = process.env.SMS_GATEWAY_USERNAME;
  const password = process.env.SMS_GATEWAY_PASSWORD;
  if (!username || !password) throw new Error("SMS_GATEWAY_USERNAME/PASSWORD is not configured.");

  return fetch(`${gatewayApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      ...init.headers,
    },
    cache: "no-store",
  });
}
