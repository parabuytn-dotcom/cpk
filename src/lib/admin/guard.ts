import "server-only";
import { getCurrentProfile } from "@/lib/auth/session";
import { hasPassedAdminVerification } from "@/lib/admin/adminVerification";

/**
 * Throws unless the caller is an admin who has passed the SMS verification.
 * Call at the top of every admin Server Action. The verification is checked here
 * too, not only in proxy.ts: a Server Action can be invoked from any page, so
 * the /admin redirect alone wouldn't stop one being called without the code.
 */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized");
  }
  if (!(await hasPassedAdminVerification())) {
    throw new Error("Vérification par SMS requise.");
  }
  return profile;
}
