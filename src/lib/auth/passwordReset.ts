"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPhoneOtp, verifyPhoneOtp, otpMessage } from "@/lib/phoneVerification";
import { sendSms } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { renderEmail, plainTextToHtml } from "@/lib/emailTemplate";
import { phoneSchema } from "./schemas";

const RESET_OPTIONS = { cooldownSeconds: 60, maxAttempts: 5 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ResetChannel = "email" | "sms";

export type RequestResetResult =
  | { success: true; channel: ResetChannel; hint: string }
  | { success: false; error: string };

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  const head = name.slice(0, 2);
  return `${head}${"•".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

function maskPhone(phone: string) {
  return phone.length <= 2 ? phone : "•".repeat(phone.length - 2) + phone.slice(-2);
}

/**
 * The phone number is every account's identifier, so it's what the form asks
 * for. A real inbox is preferred for delivery when the account has one — it's
 * free and carries more context than 160 characters — and SMS is the fallback
 * for the phone-only accounts, which are the majority.
 */
async function findAccount(
  phone: string,
): Promise<{ id: string; phone: string; email: string | null } | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, phone, contact_email")
    .eq("phone", phone)
    .maybeSingle();
  if (!profile) return null;

  let email =
    profile.contact_email && EMAIL_RE.test(profile.contact_email) ? profile.contact_email : null;

  if (!email) {
    const { data: userData } = await adminClient.auth.admin.getUserById(profile.id);
    const authEmail = userData.user?.email ?? "";
    // A phone signup carries a synthetic @cpk.internal address that goes nowhere.
    if (authEmail && !authEmail.endsWith("@cpk.internal") && EMAIL_RE.test(authEmail)) {
      email = authEmail;
    }
  }

  return { id: profile.id, phone: profile.phone, email };
}

export async function requestPasswordReset(phone: string): Promise<RequestResetResult> {
  const validated = phoneSchema.safeParse(phone);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message ?? "Numéro invalide." };
  }

  const account = await findAccount(validated.data);
  if (!account) {
    return { success: false, error: "Aucun compte ne correspond à ce numéro." };
  }

  const created = await createPhoneOtp(account.phone, "password_reset", RESET_OPTIONS);
  if (!created.success) return { success: false, error: created.error };

  if (account.email) {
    const result = await sendEmail(
      account.email,
      "Réinitialisation de votre mot de passe CPK Learn",
      renderEmail({
        title: "Réinitialisation du mot de passe",
        bodyHtml: plainTextToHtml(
          `Voici le code à saisir pour choisir un nouveau mot de passe :\n\n${created.code}\n\n` +
            "Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, " +
            "ignorez ce message : votre mot de passe actuel reste valable.",
        ),
      }),
    );
    if (!result.success) return { success: false, error: result.error };
    return { success: true, channel: "email", hint: maskEmail(account.email) };
  }

  const sms = await sendSms(account.phone, otpMessage(created.code), "phone_verification");
  if (!sms.success) return { success: false, error: sms.error };

  return { success: true, channel: "sms", hint: maskPhone(account.phone) };
}

export async function resetPasswordWithCode(
  phone: string,
  code: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const validated = phoneSchema.safeParse(phone);
  if (!validated.success) {
    return { success: false, error: "Numéro invalide." };
  }

  const account = await findAccount(validated.data);
  if (!account) return { success: false, error: "Aucun compte ne correspond à ce numéro." };

  // The code is checked and the password changed in the same request, so there
  // is no intermediate "verified" state anyone could reach on its own.
  const verified = await verifyPhoneOtp(account.phone, code.trim(), "password_reset", RESET_OPTIONS);
  if (!verified.success) return { success: false, error: verified.error };

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { error } = await adminClient.auth.admin.updateUserById(account.id, {
    password: newPassword,
  });
  if (error) return { success: false, error: error.message };

  // They just chose their own password, so any pending "you must change it"
  // requirement is satisfied.
  await adminClient.from("profiles").update({ must_change_password: false }).eq("id", account.id);

  return { success: true };
}
