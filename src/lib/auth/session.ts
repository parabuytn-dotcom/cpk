import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "parent" | "student" | "teacher" | "admin" | "staff";
export type ProfileStatus = "pending" | "validated";

export type CurrentProfile = {
  id: string;
  role: ProfileRole;
  status: ProfileStatus;
  fullName: string | null;
  parentFirstName: string | null;
  parentLastName: string | null;
  phone: string | null;
  cin: string | null;
  contactEmail: string | null;
  registrationMethod: string | null;
  tags: string[];
  avatarUrl: string | null;
  validationSeen: boolean;
  mustChangePassword: boolean;
  onboardingTourSeen: boolean;
};

/** Returns the signed-in user's profile, or null if there is no session. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  // Supabase isn't configured yet (.env.local not filled in) — every page
  // renders in "signed out" state until NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, role, status, full_name, parent_first_name, parent_last_name, phone, cin, contact_email, registration_method, tags, avatar_url, validation_seen, must_change_password, onboarding_tour_seen",
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    fullName: profile.full_name,
    parentFirstName: profile.parent_first_name,
    parentLastName: profile.parent_last_name,
    phone: profile.phone,
    cin: profile.cin,
    contactEmail: profile.contact_email,
    registrationMethod: profile.registration_method,
    tags: profile.tags ?? [],
    avatarUrl: profile.avatar_url,
    validationSeen: profile.validation_seen,
    mustChangePassword: profile.must_change_password,
    onboardingTourSeen: profile.onboarding_tour_seen,
  };
}
