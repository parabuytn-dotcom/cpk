"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { redirect } from "@/i18n/navigation";
import { cookies } from "next/headers";
import { ADMIN_PROOF_COOKIE } from "@/lib/admin/adminProof";
import {
  isSmsVerificationEnabled,
  sendPhoneOtp,
  verifyPhoneOtp,
  ensurePhoneOtpSent,
} from "@/lib/phoneVerification";
import {
  registerManualSchema,
  registerEmailSchema,
  loginPhoneSchema,
  loginEmailSchema,
  loginChildSchema,
  updateProfileInfoSchema,
  phoneSchema,
  type FormState,
} from "./schemas";

const INTERNAL_EMAIL_DOMAIN = "cpk.internal";

// Parents who sign up with just a phone number still need *an* email for
// Supabase Auth, so we mint a synthetic one they never see or use.
function phoneToEmail(phone: string) {
  return `${phone}@${INTERNAL_EMAIL_DOMAIN}`;
}

async function createParentAccount({
  email,
  password,
  cin,
  phone,
  parentFirstName,
  parentLastName,
  childFirstName,
  childClass,
  method,
  phoneVerified,
}: {
  email: string;
  password: string;
  cin: string | null;
  phone: string;
  parentFirstName: string;
  parentLastName: string;
  childFirstName: string;
  childClass: string;
  method: "manual" | "email";
  phoneVerified: boolean;
}): Promise<FormState> {
  // Created via the admin API (email_confirm: true) rather than the public
  // signUp() flow: Supabase's default "Confirm email" setting would otherwise
  // leave the account unable to log in until a confirmation link is clicked —
  // which is impossible for phone-registered accounts, since their
  // @cpk.internal address isn't real. This also lets us insert
  // profiles/students without hitting
  // the RLS insert policy (no session exists yet at this point anyway).
  const adminClient = createAdminClient();
  if (!adminClient) {
    return { message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: existingPhone } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingPhone) {
    return { message: "Ce numéro de téléphone est déjà utilisé par un autre compte." };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { message: error?.message ?? "Impossible de créer le compte." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: data.user.id,
    role: "parent",
    status: "pending",
    cin,
    phone,
    full_name: `${parentFirstName} ${parentLastName}`,
    parent_first_name: parentFirstName,
    parent_last_name: parentLastName,
    registration_method: method,
    phone_verified: phoneVerified,
  });

  if (profileError) {
    return { message: profileError.message };
  }

  const { data: classRow } = await adminClient
    .from("classes")
    .select("id")
    .eq("name", childClass)
    .maybeSingle();

  const { error: studentError } = await adminClient.from("students").insert({
    parent_id: data.user.id,
    first_name: childFirstName,
    class_name: childClass,
    class_id: classRow?.id ?? null,
  });

  if (studentError) {
    return { message: studentError.message };
  }

  // Log the brand-new account straight in instead of bouncing to /login: the
  // password was just typed on the form, so making them retype it adds a step
  // and a chance to mistype it for nothing. The account is still "pending"
  // admin validation — the dashboard shows the pending banner.
  return signInAndRedirect(email, password);
}

// Checks the phone verification gate (when enabled) before an account is
// created. Returns null when it's fine to proceed, or a FormState to return
// straight to the caller when it isn't.
async function checkRegistrationOtp(phone: string, formData: FormData): Promise<FormState | null> {
  if (!(await isSmsVerificationEnabled())) return null;

  const code = formData.get("otpCode");
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
    return { message: "Saisis le code à 6 chiffres reçu par SMS." };
  }

  const result = await verifyPhoneOtp(phone, code.trim(), "register");
  if (!result.success) return { message: result.error };

  return null;
}

export async function registerManual(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = registerManualSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
    parentFirstName: formData.get("parentFirstName"),
    parentLastName: formData.get("parentLastName"),
    childFirstName: formData.get("childFirstName"),
    childClass: formData.get("childClass"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { phone, password, parentFirstName, parentLastName, childFirstName, childClass } =
    validated.data;

  const otpError = await checkRegistrationOtp(phone, formData);
  if (otpError) return otpError;

  return createParentAccount({
    email: phoneToEmail(phone),
    password,
    cin: null,
    phone,
    parentFirstName,
    parentLastName,
    childFirstName,
    childClass,
    method: "manual",
    phoneVerified: true,
  });
}

export async function registerWithEmail(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = registerEmailSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    parentFirstName: formData.get("parentFirstName"),
    parentLastName: formData.get("parentLastName"),
    childFirstName: formData.get("childFirstName"),
    childClass: formData.get("childClass"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, phone, password, parentFirstName, parentLastName, childFirstName, childClass } =
    validated.data;

  const otpError = await checkRegistrationOtp(phone, formData);
  if (otpError) return otpError;

  return createParentAccount({
    email,
    password,
    cin: null,
    phone,
    parentFirstName,
    parentLastName,
    childFirstName,
    childClass,
    method: "email",
    phoneVerified: true,
  });
}

// Called directly from the client (not a useActionState form action) when the
// user taps "Envoyer le code" on the registration form, before the account
// exists — so it takes a raw phone string rather than FormData.
export async function sendRegistrationOtp(
  phone: string,
): Promise<{ success: boolean; message?: string }> {
  if (!(await isSmsVerificationEnabled())) return { success: true };

  const validated = phoneSchema.safeParse(phone);
  if (!validated.success) {
    return { success: false, message: validated.error.issues[0]?.message ?? "Numéro invalide." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: existingPhone } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", validated.data)
    .maybeSingle();
  if (existingPhone) {
    return { success: false, message: "Ce numéro de téléphone est déjà utilisé par un autre compte." };
  }

  const result = await sendPhoneOtp(validated.data, "register");
  return result.success ? { success: true } : { success: false, message: result.error };
}

// Same as above but for a signed-in user changing their phone from their
// profile page — checked against every OTHER profile's phone, not their own.
export async function sendProfileVerificationOtp(
  newPhone: string,
): Promise<{ success: boolean; message?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false, message: "Non connecté." };
  if (!(await isSmsVerificationEnabled())) return { success: true };

  const validated = phoneSchema.safeParse(newPhone);
  if (!validated.success) {
    return { success: false, message: validated.error.issues[0]?.message ?? "Numéro invalide." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: existing } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", validated.data)
    .maybeSingle();
  if (existing && existing.id !== profile.id) {
    return { success: false, message: "Ce numéro de téléphone est déjà utilisé par un autre compte." };
  }

  const result = await sendPhoneOtp(validated.data, "update");
  return result.success ? { success: true } : { success: false, message: result.error };
}

async function signInAndRedirect(email: string, password: string): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { message: "Identifiants incorrects." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect({
    href: profile?.role === "admin" ? "/admin" : "/dashboard",
    locale: await getLocale(),
  });
}

export async function loginWithPhone(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = loginPhoneSchema.safeParse({
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { message: "Supabase (clé service_role) n'est pas configuré." };
  }

  // Everyone has a phone now regardless of how they registered (CIN with a
  // synthetic email, or a real email) — look up their real auth email via
  // the admin API so both cases can log in with the same phone+password form.
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", validated.data.phone)
    .maybeSingle();

  if (!profile) {
    return { message: "Identifiants incorrects." };
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    profile.id,
  );
  if (userError || !userData.user?.email) {
    return { message: "Identifiants incorrects." };
  }

  return signInAndRedirect(userData.user.email, validated.data.password);
}

export async function loginWithEmail(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = loginEmailSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  return signInAndRedirect(validated.data.email, validated.data.password);
}

export async function loginAsChild(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = loginChildSchema.safeParse({
    studentId: formData.get("studentId"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { message: "Identifiants incorrects." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: student } = await adminClient
    .from("students")
    .select("user_id")
    .eq("id", validated.data.studentId)
    .maybeSingle();

  if (!student?.user_id) {
    return { message: "Identifiants incorrects." };
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    student.user_id,
  );
  if (userError || !userData.user?.email) {
    return { message: "Identifiants incorrects." };
  }

  return signInAndRedirect(userData.user.email, validated.data.password);
}

// Used after a QR "document" token's first-time auto-login window has
// closed (must_change_password is already false) — the printed QR alone no
// longer signs anyone in; it just identifies the account, and the parent
// still has to supply the password they chose during their first login.
export async function loginWithQrToken(_state: FormState, formData: FormData): Promise<FormState> {
  const token = formData.get("token");
  const password = formData.get("password");
  if (typeof token !== "string" || !token) {
    return { message: "Code QR invalide." };
  }
  if (typeof password !== "string" || !password) {
    return { message: "Mot de passe requis." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("qr_login_token", token)
    .maybeSingle();
  if (!profile) {
    return { message: "Code QR invalide." };
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    profile.id,
  );
  if (userError || !userData.user?.email) {
    return { message: "Compte introuvable." };
  }

  return signInAndRedirect(userData.user.email, password);
}

// ---------------------------------------------------------------------------
// Re-login by SMS code — the printed "document" QR (see /api/qr-login and
// /qr-login/[token]) used to ask for the account's password on every scan
// after the first. It now texts a code to the phone on file instead, and
// only falls back to the password field after 3 wrong tries.
// ---------------------------------------------------------------------------

const QR_OTP_OPTIONS = { cooldownSeconds: 90, maxAttempts: 3 };

async function getPhoneForQrToken(token: string): Promise<{ id: string; phone: string | null } | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;
  const { data } = await adminClient
    .from("profiles")
    .select("id, phone")
    .eq("qr_login_token", token)
    .maybeSingle();
  return data;
}

// Called once when the re-login page mounts. Sends a fresh code only if
// there isn't already a live one, so a remount/refresh never fires a second
// SMS or resets the 3-attempt budget below.
export async function sendQrLoginOtp(
  token: string,
): Promise<
  { success: true; alreadySent: boolean } | { success: false; error: string; attemptsExhausted?: boolean }
> {
  const profile = await getPhoneForQrToken(token);
  if (!profile?.phone) {
    return { success: false, error: "Aucun numéro de téléphone n'est enregistré sur ce compte." };
  }
  return ensurePhoneOtpSent(profile.phone, "qr_login", QR_OTP_OPTIONS);
}

// The explicit "renvoyer le code" button — always attempts a real send,
// which enforces its own 90-second cooldown.
export async function resendQrLoginOtp(token: string): Promise<{ success: boolean; message?: string }> {
  const profile = await getPhoneForQrToken(token);
  if (!profile?.phone) {
    return { success: false, message: "Aucun numéro de téléphone n'est enregistré sur ce compte." };
  }
  const result = await sendPhoneOtp(profile.phone, "qr_login", QR_OTP_OPTIONS);
  return result.success ? { success: true } : { success: false, message: result.error };
}

export async function verifyQrLoginOtp(
  token: string,
  code: string,
): Promise<{ success: false; message: string; attemptsExhausted: boolean } | undefined> {
  const profile = await getPhoneForQrToken(token);
  if (!profile?.phone) {
    return {
      success: false,
      message: "Aucun numéro de téléphone n'est enregistré sur ce compte.",
      attemptsExhausted: true,
    };
  }

  const result = await verifyPhoneOtp(profile.phone, code, "qr_login", QR_OTP_OPTIONS);
  if (!result.success) {
    return {
      success: false,
      message: result.error,
      attemptsExhausted: result.attemptsRemaining === 0,
    };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      success: false,
      message: "Supabase (clé service_role) n'est pas configuré.",
      attemptsExhausted: false,
    };
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.id);
  const email = userData.user?.email;
  if (userError || !email) {
    return { success: false, message: "Compte introuvable.", attemptsExhausted: false };
  }

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    return { success: false, message: "Connexion impossible.", attemptsExhausted: false };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (verifyError) {
    return { success: false, message: "Connexion impossible.", attemptsExhausted: false };
  }

  redirect({ href: "/dashboard", locale: await getLocale() });
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ADMIN_PROOF_COOKIE);
  redirect({ href: "/login", locale: await getLocale() });
}

export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Non connecté." };

  const password = formData.get("password");
  const confirm = formData.get("confirm");
  if (typeof password !== "string" || password.length < 6) {
    return { message: "Le mot de passe doit contenir au moins 6 caractères." };
  }
  if (password !== confirm) {
    return { message: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const { error: updateAuthError } = await supabase.auth.updateUser({ password });
  if (updateAuthError) return { message: updateAuthError.message };

  const { error } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id);
  if (error) return { message: error.message };

  redirect({ href: "/dashboard", locale: await getLocale() });
}

export async function markValidationSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ validation_seen: true }).eq("id", user.id);
}

export async function markOnboardingTourSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ onboarding_tour_seen: true }).eq("id", user.id);
}

// The file itself is uploaded client-side, straight to Supabase Storage (see
// AvatarUpload) — Next.js Server Actions cap request bodies at 1MB by
// default, and Vercel's own serverless function limit (4.5MB) can't be
// raised at all, so a typical phone photo sent through this action directly
// would routinely fail. Only the resulting public URL arrives here.
export async function updateAvatarUrl(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Non connecté." };

  const avatarUrl = formData.get("avatarUrl");
  if (typeof avatarUrl !== "string" || !avatarUrl) {
    return { message: "Photo invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", profile.id);
  if (error) return { message: error.message };

  revalidatePath("/", "layout");
  return { success: "Photo de profil mise à jour." };
}

export async function updateProfileInfo(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Non connecté." };

  const validated = updateProfileInfoSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    cin: formData.get("cin") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { fullName, phone, cin, contactEmail } = validated.data;

  const adminClient = createAdminClient();
  if (!adminClient) return { message: "Supabase (clé service_role) n'est pas configuré." };

  // Uniqueness checks (phone/cin are unique-ish identifiers used for login
  // lookup) — done via the admin client since regular users can't read
  // other people's profiles under RLS.
  const phoneChanged = phone !== profile.phone;

  if (phoneChanged) {
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing && existing.id !== profile.id) {
      return { message: "Ce numéro de téléphone est déjà utilisé par un autre compte." };
    }

    if (await isSmsVerificationEnabled()) {
      const code = formData.get("otpCode");
      if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
        return { message: "Saisis le code à 6 chiffres reçu par SMS pour confirmer ce numéro." };
      }
      const result = await verifyPhoneOtp(phone, code.trim(), "update");
      if (!result.success) return { message: result.error };
    }
  }

  if (cin && cin !== profile.cin) {
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("cin", cin)
      .maybeSingle();
    if (existing && existing.id !== profile.id) {
      return { message: "Ce CIN est déjà utilisé par un autre compte." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      cin: cin || null,
      contact_email: contactEmail || null,
      ...(phoneChanged ? { phone_verified: true } : {}),
    })
    .eq("id", profile.id);

  if (error) return { message: error.message };

  revalidatePath("/", "layout");
  return { success: "Informations mises à jour." };
}
