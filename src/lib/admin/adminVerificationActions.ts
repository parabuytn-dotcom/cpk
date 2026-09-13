"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/admin/guard";
import { ensurePhoneOtpSent, sendPhoneOtp, verifyPhoneOtp } from "@/lib/phoneVerification";
import { getSessionIdentity, getVerificationPhoneFor } from "@/lib/admin/adminVerification";
import { canUseAdminArea } from "@/lib/auth/roles";
import { ADMIN_PROOF_COOKIE, ADMIN_PROOF_TTL_SECONDS, createAdminProof } from "@/lib/admin/adminProof";
import type { FormState } from "./schemas";

const OTP_OPTIONS = { cooldownSeconds: 60, maxAttempts: 5 };

function maskPhone(phone: string) {
  return "•".repeat(Math.max(phone.length - 2, 0)) + phone.slice(-2);
}

// Not requireAdmin(): that one demands the very verification these actions
// perform. Being allowed into the admin area is the only prerequisite here.
async function assertAdminAreaRole() {
  const profile = await getCurrentProfile();
  return profile && canUseAdminArea(profile.role) ? profile : null;
}

const NO_PHONE =
  "Aucun numéro de téléphone valide sur ton profil : ajoute-le dans Mon espace, ou demande à l'administration de désactiver la vérification.";

export async function sendAdminVerificationCode(
  resend: boolean,
): Promise<{ success: true; hint: string } | { success: false; error: string; mustWait?: boolean }> {
  const profile = await assertAdminAreaRole();
  if (!profile) return { success: false, error: "Non autorisé." };

  const phone = await getVerificationPhoneFor(profile);
  if (!phone) return { success: false, error: NO_PHONE };
  const result = resend
    ? await sendPhoneOtp(phone, "admin_login", OTP_OPTIONS)
    : await ensurePhoneOtpSent(phone, "admin_login", OTP_OPTIONS);

  if (!result.success) {
    return {
      success: false,
      error:
        "attemptsExhausted" in result && result.attemptsExhausted
          ? "Trop de codes erronés. Demande un nouveau code."
          : result.error,
    };
  }
  return { success: true, hint: maskPhone(phone) };
}

export async function verifyAdminCode(code: string): Promise<{ success: false; error: string } | undefined> {
  const profile = await assertAdminAreaRole();
  if (!profile) return { success: false, error: "Non autorisé." };

  const phone = await getVerificationPhoneFor(profile);
  if (!phone) return { success: false, error: NO_PHONE };
  const result = await verifyPhoneOtp(phone, code.trim(), "admin_login", OTP_OPTIONS);
  if (!result.success) return { success: false, error: result.error };

  const identity = await getSessionIdentity();
  if (!identity) return { success: false, error: "Session introuvable, reconnecte-toi." };

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_PROOF_COOKIE, await createAdminProof(identity.userId, identity.sessionId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_PROOF_TTL_SECONDS,
  });

  redirect({ href: "/admin", locale: await getLocale() });
}

export async function updateAdminVerificationSetting(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const enabled = formData.get("enabled") === "true";
  const phone = String(formData.get("phone") ?? "").trim();
  if (enabled && !/^\d{8}$/.test(phone)) {
    return { message: "Numéro invalide (8 chiffres, ex : 52254129)." };
  }

  const supabase = await createClient();
  const rows = [{ key: "admin_sms_verification_enabled", value: enabled ? "true" : "false" }];
  if (/^\d{8}$/.test(phone)) rows.push({ key: "admin_verification_phone", value: phone });

  const { error } = await supabase.from("site_settings").upsert(rows);
  if (error) return { message: error.message };

  revalidatePath("/admin/parametres");
  return {
    success: enabled
      ? `Vérification activée : le code sera envoyé au ${phone}.`
      : "Vérification désactivée : l'espace admin s'ouvre avec le seul mot de passe.",
  };
}
