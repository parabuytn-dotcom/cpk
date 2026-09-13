import "server-only";
import { randomInt, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSetting } from "@/lib/admin/data";
import { sendSms } from "@/lib/smsService";

export type OtpPurpose = "register" | "update" | "qr_login" | "password_reset" | "admin_login";

const CODE_TTL_MINUTES = 10;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_MAX_ATTEMPTS = 5;

export type OtpOptions = { cooldownSeconds?: number; maxAttempts?: number };

export type OtpResult =
  | { success: true }
  | { success: false; error: string; attemptsRemaining?: number };

export async function isSmsVerificationEnabled(): Promise<boolean> {
  const value = await getSiteSetting("sms_verification_enabled");
  return value === "true";
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generates and stores a 6-digit code, replacing any still-valid one for the
 * same phone+purpose, and returns it <b>in clear</b> so the caller can deliver
 * it over the channel it chooses. Server-side only: this value must never be
 * returned to a browser. Callers delivering by SMS should use sendPhoneOtp().
 */
export async function createPhoneOtp(
  phone: string,
  purpose: OtpPurpose,
  options: OtpOptions = {},
): Promise<{ success: true; code: string } | { success: false; error: string }> {
  const cooldownSeconds = options.cooldownSeconds ?? DEFAULT_RESEND_COOLDOWN_SECONDS;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const cooldownStart = new Date(Date.now() - cooldownSeconds * 1000).toISOString();
  const { data: recent } = await adminClient
    .from("phone_otps")
    .select("id")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gte("created_at", cooldownStart)
    .maybeSingle();

  if (recent) {
    const waitLabel =
      cooldownSeconds % 60 === 0 ? `${cooldownSeconds / 60} minute(s)` : `${cooldownSeconds} secondes`;
    return { success: false, error: `Patiente ${waitLabel} avant de redemander un code.` };
  }

  // A resend invalidates whatever code was sent before it, so only the
  // latest one texted to the user can ever succeed.
  await adminClient
    .from("phone_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await adminClient.from("phone_otps").insert({
    phone,
    code_hash: hashCode(code),
    purpose,
    expires_at: expiresAt,
  });
  if (insertError) return { success: false, error: insertError.message };

  return { success: true, code };
}

export function otpMessage(code: string) {
  return `Votre code de vérification CPK Learn est : ${code}. Il expire dans ${CODE_TTL_MINUTES} minutes.`;
}

/** Generates a code and texts it to the number itself. */
export async function sendPhoneOtp(
  phone: string,
  purpose: OtpPurpose,
  options: OtpOptions = {},
): Promise<OtpResult> {
  const created = await createPhoneOtp(phone, purpose, options);
  if (!created.success) return created;

  const sms = await sendSms(phone, otpMessage(created.code), "phone_verification");
  if (!sms.success) return { success: false, error: sms.error };

  return { success: true };
}

/**
 * Sends a code only if there isn't already a live one for this phone+purpose
 * — for flows that auto-trigger a send on page load (a remount, a strict-mode
 * double-effect, or a plain refresh shouldn't fire a second SMS or reset an
 * in-progress attempt count). Callers that need an explicit resend button
 * should call sendPhoneOtp() directly instead, which always sends (subject to
 * its own cooldown check).
 */
export async function ensurePhoneOtpSent(
  phone: string,
  purpose: OtpPurpose,
  options: OtpOptions = {},
): Promise<{ success: true; alreadySent: boolean } | { success: false; error: string; attemptsExhausted?: boolean }> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: existing } = await adminClient
    .from("phone_otps")
    .select("attempts, expires_at")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && new Date(existing.expires_at) >= new Date()) {
    if (existing.attempts >= maxAttempts) {
      return { success: false, error: "Trop de tentatives.", attemptsExhausted: true };
    }
    return { success: true, alreadySent: true };
  }

  const sent = await sendPhoneOtp(phone, purpose, options);
  return sent.success ? { success: true, alreadySent: false } : sent;
}

/** Verifies a code entered by the user against the latest one sent for this phone+purpose. */
export async function verifyPhoneOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose,
  options: OtpOptions = {},
): Promise<OtpResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: otp } = await adminClient
    .from("phone_otps")
    .select("id, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return { success: false, error: "Aucun code en attente. Redemande un code.", attemptsRemaining: 0 };
  }
  if (new Date(otp.expires_at) < new Date()) {
    return { success: false, error: "Code expiré. Redemande un code.", attemptsRemaining: 0 };
  }
  if (otp.attempts >= maxAttempts) {
    return { success: false, error: "Trop de tentatives. Redemande un code.", attemptsRemaining: 0 };
  }

  if (hashCode(code) !== otp.code_hash) {
    const attempts = otp.attempts + 1;
    await adminClient.from("phone_otps").update({ attempts }).eq("id", otp.id);
    return {
      success: false,
      error: "Code invalide.",
      attemptsRemaining: Math.max(0, maxAttempts - attempts),
    };
  }

  await adminClient
    .from("phone_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);

  return { success: true };
}
