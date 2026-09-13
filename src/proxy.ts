import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { ADMIN_PROOF_COOKIE, isAdminVerificationEnabled, isValidAdminProof } from "@/lib/admin/adminProof";

const handleI18nRouting = createMiddleware(routing);

function stripLocale(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && routing.locales.includes(segments[0] as (typeof routing.locales)[number])) {
    segments.shift();
  }
  return "/" + segments.join("/");
}

export default async function proxy(request: NextRequest) {
  // 1. Resolve locale (redirects/rewrites for locale prefixes)
  const i18nResponse = handleI18nRouting(request);

  // 2. Refresh the Supabase auth session on the resulting response
  const { response, user, role, mustChangePassword, supabase } = await updateSession(
    request,
    i18nResponse,
  );

  // 3. Protect /admin routes (optimistic check — real authorization happens
  //    again in the admin layout/data access layer, see AGENTS/docs guidance).
  const pathWithoutLocale = stripLocale(request.nextUrl.pathname);

  if (pathWithoutLocale.startsWith("/admin")) {
    if (!user || role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // A password alone doesn't open the admin area: the session also needs the
    // code texted to the admin phone, unless that's been switched off in
    // Admin > Réglages.
    if (supabase) {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "admin_sms_verification_enabled")
        .maybeSingle();

      if (isAdminVerificationEnabled(setting?.value ?? null)) {
        const { data } = await supabase.auth.getClaims();
        const claims = data?.claims as { sub?: string; session_id?: string } | undefined;
        const verified =
          claims?.sub && claims.session_id
            ? await isValidAdminProof(request.cookies.get(ADMIN_PROOF_COOKIE)?.value, claims.sub, claims.session_id)
            : false;
        if (!verified) {
          return NextResponse.redirect(new URL("/verification-securite", request.url));
        }
      }
    }
  }

  // 4. Force a password change before anything else — set on first login
  //    for accounts bootstrapped from a printed "document" (QR or
  //    identifiant+password), whether scanned or typed in.
  if (user && mustChangePassword && pathWithoutLocale !== "/changer-mot-de-passe") {
    return NextResponse.redirect(new URL("/changer-mot-de-passe", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
