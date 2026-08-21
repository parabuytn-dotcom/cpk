import "server-only";
import { getCurrentProfile } from "@/lib/auth/session";

/** Throws unless the caller is a validated admin. Call at the top of every admin Server Action. */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return profile;
}
