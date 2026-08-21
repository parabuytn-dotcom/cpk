import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SmsTrigger = "teacher_absence" | "generated_password" | "manual";

export type SendSmsResult = { success: true } | { success: false; error: string };

/**
 * Sends an SMS through the configurable local gateway (e.g. an Android phone
 * running an "SMS Gateway" app exposing an HTTP API) and logs the attempt in
 * `sms_logs`. The gateway itself — and the physical phone/SIM behind
 * SMS_SENDER_NUMBER — is operated outside of this codebase; this service only
 * talks to whatever URL is configured in SMS_GATEWAY_URL.
 */
export async function sendSms(
  phone: string,
  message: string,
  trigger: SmsTrigger = "manual",
): Promise<SendSmsResult> {
  const gatewayUrl = process.env.SMS_GATEWAY_URL;
  const gatewayToken = process.env.SMS_GATEWAY_TOKEN;

  let result: SendSmsResult;

  if (!gatewayUrl) {
    result = { success: false, error: "SMS_GATEWAY_URL is not configured." };
  } else {
    try {
      const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
        },
        body: JSON.stringify({
          to: phone,
          message,
          from: process.env.SMS_SENDER_NUMBER,
        }),
      });

      result = response.ok
        ? { success: true }
        : { success: false, error: `Gateway responded with ${response.status}` };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown gateway error",
      };
    }
  }

  await logSmsAttempt(phone, message, trigger, result);

  // TODO: Intégrer API Push Mobile — miroir de cette notification en push
  // pour l'app mobile une fois disponible.

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
