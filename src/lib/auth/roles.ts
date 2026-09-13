// Who may do what in the admin area. Kept free of server imports so the proxy,
// server code and client components can all share one definition instead of
// each repeating their own `role === "admin"` checks.
//
// - admin and director: the whole admin area, no difference between them.
// - staff: only the school-life pages below (absences, timetable, homework).

export type AdminAreaRole = "admin" | "director" | "staff";

export function isFullAdmin(role: string | null | undefined) {
  return role === "admin" || role === "director";
}

export function canUseAdminArea(role: string | null | undefined): role is AdminAreaRole {
  return isFullAdmin(role) || role === "staff";
}

/** The admin pages a staff account may open. */
export const STAFF_ADMIN_PATHS = ["/admin/absences", "/admin/emploi-du-temps", "/admin/devoirs"];

/** Where a staff account lands when it opens /admin or a page it can't use. */
export const STAFF_ADMIN_HOME = "/admin/absences";

export function canOpenAdminPath(role: string | null | undefined, path: string) {
  if (isFullAdmin(role)) return true;
  if (role !== "staff") return false;
  return STAFF_ADMIN_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}
