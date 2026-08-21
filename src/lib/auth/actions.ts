"use server";

import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "@/i18n/navigation";
import {
  registerManualSchema,
  registerEmailSchema,
  loginPhoneSchema,
  loginEmailSchema,
  updatePhoneSchema,
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

  const { error: studentError } = await adminClient.from("students").insert({
    parent_id: data.user.id,
    first_name: childFirstName,
    class_name: childClass,
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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/login", locale: await getLocale() });
}

export async function markValidationSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ validation_seen: true }).eq("id", user.id);
}

export async function updateOwnPhone(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = updatePhoneSchema.safeParse({ phone: formData.get("phone") });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "Non connecté." };

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: existingPhone } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", validated.data.phone)
    .maybeSingle();

  if (existingPhone && existingPhone.id !== user.id) {
    return { message: "Ce numéro est déjà utilisé par un autre compte." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ phone: validated.data.phone })
    .eq("id", user.id);

  if (error) return { message: error.message };
  return { success: "Numéro enregistré." };
}
