import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSiteSetting } from "@/lib/admin/data";
import {
  ADMIN_PROOF_COOKIE,
  DEFAULT_ADMIN_VERIFICATION_PHONE,
  isAdminVerificationEnabled,
  isValidAdminProof,
} from "@/lib/admin/adminProof";

export async function getAdminVerificationSettings() {
  const [enabled, phone] = await Promise.all([
    getSiteSetting("admin_sms_verification_enabled"),
    getSiteSetting("admin_verification_phone"),
  ]);
  return {
    enabled: isAdminVerificationEnabled(enabled),
    phone: phone && /^\d{8}$/.test(phone) ? phone : DEFAULT_ADMIN_VERIFICATION_PHONE,
  };
}

/**
 * Where the code for this account goes. The admin account uses the number set
 * in Admin > Réglages; the director and staff get it on their own profile
 * number, so their logins don't text the admin's phone.
 */
export async function getVerificationPhoneFor(profile: { role: string; phone: string | null }) {
  if (profile.role === "admin") return (await getAdminVerificationSettings()).phone;
  return profile.phone && /^\d{8}$/.test(profile.phone) ? profile.phone : null;
}

/** The signed-in user id and Supabase session id, read from the verified JWT. */
export async function getSessionIdentity(): Promise<{ userId: string; sessionId: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { sub?: string; session_id?: string } | undefined;
  if (!claims?.sub || !claims.session_id) return null;
  return { userId: claims.sub, sessionId: claims.session_id };
}

/** True when verification is off, or this session has already entered a valid code. */
export async function hasPassedAdminVerification() {
  const { enabled } = await getAdminVerificationSettings();
  if (!enabled) return true;

  const identity = await getSessionIdentity();
  if (!identity) return false;

  const cookieStore = await cookies();
  return isValidAdminProof(cookieStore.get(ADMIN_PROOF_COOKIE)?.value, identity.userId, identity.sessionId);
}
