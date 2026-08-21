"use server";

import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import {
  registerManualSchema,
  registerEmailSchema,
  loginCinSchema,
  loginEmailSchema,
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
  parentFirstName,
  parentLastName,
  childFirstName,
  childClass,
  method,
}: {
  email: string;
  password: string;
  cin: string | null;
  parentFirstName: string;
  parentLastName: string;
  childFirstName: string;
  childClass: string;
  method: "manual" | "email";
}): Promise<FormState> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    return { message: error?.message ?? "Impossible de créer le compte." };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    role: "parent",
    status: "pending",
    cin,
    parent_first_name: parentFirstName,
    parent_last_name: parentLastName,
    registration_method: method,
  });

  if (profileError) {
    return { message: profileError.message };
  }

  const { error: studentError } = await supabase.from("students").insert({
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
    password: formData.get("password"),
    parentFirstName: formData.get("parentFirstName"),
    parentLastName: formData.get("parentLastName"),
    childFirstName: formData.get("childFirstName"),
    childClass: formData.get("childClass"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { cin, password, parentFirstName, parentLastName, childFirstName, childClass } =
    validated.data;

  return createParentAccount({
    email: cinToEmail(cin),
    password,
    cin,
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
    password: formData.get("password"),
    parentFirstName: formData.get("parentFirstName"),
    parentLastName: formData.get("parentLastName"),
    childFirstName: formData.get("childFirstName"),
    childClass: formData.get("childClass"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password, parentFirstName, parentLastName, childFirstName, childClass } =
    validated.data;

  return createParentAccount({
    email,
    password,
    cin: null,
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

export async function loginWithCin(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validated = loginCinSchema.safeParse({
    cin: formData.get("cin"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  return signInAndRedirect(cinToEmail(validated.data.cin), validated.data.password);
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
