import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ProfileRole = "parent" | "student" | "admin" | "staff";
export type ProfileStatus = "pending" | "validated";

export type CurrentProfile = {
  id: string;
  role: ProfileRole;
  status: ProfileStatus;
  parentFirstName: string | null;
  parentLastName: string | null;
  validationSeen: boolean;
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
      "id, role, status, parent_first_name, parent_last_name, validation_seen",
    )
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    parentFirstName: profile.parent_first_name,
    parentLastName: profile.parent_last_name,
    validationSeen: profile.validation_seen,
  };
}
