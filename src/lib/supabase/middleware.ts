import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie on every request and returns both
 * the (possibly redirected) response and the authenticated user, so callers
 * in `proxy.ts` can make routing decisions (e.g. protecting /admin) without
 * a second round-trip.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase isn't configured yet (.env.local not filled in) — treat every
  // request as anonymous instead of crashing the whole site on every route.
  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, user: null, role: null, mustChangePassword: false };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let mustChangePassword = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
    mustChangePassword = profile?.must_change_password ?? false;
  }

  return { response, user, role, mustChangePassword };
}
