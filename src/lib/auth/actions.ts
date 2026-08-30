"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { redirect } from "@/i18n/navigation";
import {
  registerManualSchema,
  registerEmailSchema,
  loginPhoneSchema,
  loginEmailSchema,
  loginChildSchema,
  updateProfileInfoSchema,
  type FormState,
} from "./schemas";

const CIN_EMAIL_DOMAIN = "cpk.internal";

function cinToEmail(cin: string) {
  return `${cin}@${CIN_EMAIL_DOMAIN}`;
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
}): Promise<FormState> {
  // Created via the admin API (email_confirm: true) rather than the public
  // signUp() flow: Supabase's default "Confirm email" setting would otherwise
  // leave the account unable to log in until a confirmation link is clicked —
  // which is impossible for CIN accounts, since their @cpk.internal address
  // isn't real. This also lets us insert profiles/students without hitting
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

  redirect({
    href: { pathname: "/login", query: { registered: "1" } },
    locale: await getLocale(),
  });
}

export async function registerManual(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = registerManualSchema.safeParse({
    cin: formData.get("cin"),
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

  const { cin, phone, password, parentFirstName, parentLastName, childFirstName, childClass } =
    validated.data;

  return createParentAccount({
    email: cinToEmail(cin),
    password,
    cin,
    phone,
    parentFirstName,
    parentLastName,
    childFirstName,
    childClass,
    method: "manual",
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
  });
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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
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
  if (phone !== profile.phone) {
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing && existing.id !== profile.id) {
      return { message: "Ce numéro de téléphone est déjà utilisé par un autre compte." };
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
    })
    .eq("id", profile.id);

  if (error) return { message: error.message };

  revalidatePath("/", "layout");
  return { success: "Informations mises à jour." };
}
