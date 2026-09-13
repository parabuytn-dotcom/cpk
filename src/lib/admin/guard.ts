import "server-only";
import { getCurrentProfile } from "@/lib/auth/session";
import { hasPassedAdminVerification } from "@/lib/admin/adminVerification";
import { canUseAdminArea, isFullAdmin } from "@/lib/auth/roles";

// Both guards also check the SMS verification, not only proxy.ts: a Server
// Action can be invoked from any page, so the /admin redirect alone wouldn't
// stop one being called without the code.

/** Throws unless the caller is an admin or the director. Call at the top of every admin Server Action. */
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !isFullAdmin(profile.role)) {
    throw new Error("Unauthorized");
  }
  if (!(await hasPassedAdminVerification())) {
    throw new Error("Vérification par SMS requise.");
  }
  return profile;
}

/** Like requireAdmin, but also lets staff through — for absences, the timetable and homework. */
export async function requireSchoolStaff() {
  const profile = await getCurrentProfile();
  if (!profile || !canUseAdminArea(profile.role)) {
    throw new Error("Unauthorized");
  }
  if (!(await hasPassedAdminVerification())) {
    throw new Error("Vérification par SMS requise.");
  }
  return profile;
}
