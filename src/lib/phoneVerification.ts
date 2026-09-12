import "server-only";
import { randomInt, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSetting } from "@/lib/admin/data";
import { sendSms } from "@/lib/smsService";

export type OtpPurpose = "register" | "update";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export type OtpResult = { success: true } | { success: false; error: string };

export async function isSmsVerificationEnabled(): Promise<boolean> {
  const value = await getSiteSetting("sms_verification_enabled");
  return value === "true";
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

/** Generates and SMS's a 6-digit code, replacing any still-valid code for the same phone+purpose. */
export async function sendPhoneOtp(phone: string, purpose: OtpPurpose): Promise<OtpResult> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const cooldownStart = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: recent } = await adminClient
    .from("phone_otps")
    .select("id")
    .eq("phone", phone)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gte("created_at", cooldownStart)
    .maybeSingle();

  if (recent) {
    return { success: false, error: "Patiente une minute avant de redemander un code." };
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

  const sms = await sendSms(
    phone,
    `Votre code de vérification CPK Learn est : ${code}. Il expire dans ${CODE_TTL_MINUTES} minutes.`,
    "phone_verification",
  );
  if (!sms.success) return { success: false, error: sms.error };

  return { success: true };
}

/** Verifies a code entered by the user against the latest one sent for this phone+purpose. */
export async function verifyPhoneOtp(
  phone: string,
  code: string,
  purpose: OtpPurpose,
): Promise<OtpResult> {
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
    return { success: false, error: "Aucun code en attente. Redemande un code." };
  }
  if (new Date(otp.expires_at) < new Date()) {
    return { success: false, error: "Code expiré. Redemande un code." };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: "Trop de tentatives. Redemande un code." };
  }

  if (hashCode(code) !== otp.code_hash) {
    await adminClient
      .from("phone_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return { success: false, error: "Code invalide." };
  }

  await adminClient
    .from("phone_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);

  return { success: true };
}
