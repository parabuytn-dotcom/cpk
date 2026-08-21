import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

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
  const { response, user, role } = await updateSession(request, i18nResponse);

  // 3. Protect /admin routes (optimistic check — real authorization happens
  //    again in the admin layout/data access layer, see AGENTS/docs guidance).
  const pathWithoutLocale = stripLocale(request.nextUrl.pathname);

  if (pathWithoutLocale.startsWith("/admin")) {
    if (!user || role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
