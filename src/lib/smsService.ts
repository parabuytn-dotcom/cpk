import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SmsTrigger = "teacher_absence" | "generated_password" | "manual";

export type SendSmsResult = { success: true } | { success: false; error: string };

const DEFAULT_GATEWAY_URL = "https://api.sms-gate.app/3rdparty/v1/messages";
const COUNTRY_CODE = "216";

function toInternational(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith(COUNTRY_CODE) ? digits : `${COUNTRY_CODE}${digits}`;
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

  await logSmsAttempt(phone, message, trigger, result);

  return result;
}

async function logSmsAttempt(
  phone: string,
  message: string,
  trigger: SmsTrigger,
  result: SendSmsResult,
) {
  const supabase = await createClient();
  await supabase.from("sms_logs").insert({
    phone,
    message,
    trigger,
    status: result.success ? "sent" : "failed",
    error: result.success ? null : result.error,
  });
}
