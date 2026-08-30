import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges a long-lived, single-use QR token (printed on a "document" —
 * see /admin/documents) for a real Supabase session. The token itself never
 * touches Supabase Auth: we look up who it belongs to with the service-role
 * client, mint a short-lived Supabase magic link for them on the spot, and
 * immediately verify it server-side so its own (short) expiry never matters —
 * only our own qr_login_token, which we control, needs to survive for weeks
 * on a piece of paper.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { origin } = request.nextUrl;
  const fail = () => NextResponse.redirect(new URL("/login?qrError=1", origin));

  const adminClient = createAdminClient();
  if (!adminClient) return fail();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("qr_login_token", token)
    .maybeSingle();
  if (!profile) return fail();

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    profile.id,
  );
  const email = userData.user?.email;
  if (userError || !email) return fail();

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkError || !tokenHash) return fail();

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (verifyError) return fail();

  // Single-use: clear the token now that it has been consumed.
  await adminClient.from("profiles").update({ qr_login_token: null }).eq("id", profile.id);

  return NextResponse.redirect(new URL("/changer-mot-de-passe", origin));
}
