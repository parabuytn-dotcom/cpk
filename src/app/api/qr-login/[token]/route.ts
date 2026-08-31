import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges a long-lived QR token (printed on a "document" — see
 * /admin/documents) for a real Supabase session. The token itself never
 * touches Supabase Auth: we look up who it belongs to with the service-role
 * client, mint a short-lived Supabase magic link for them on the spot, and
 * immediately verify it server-side so its own (short) expiry never matters —
 * only our own qr_login_token, which we control, needs to survive for weeks
 * on a piece of paper.
 *
 * The token is NOT single-use — it stays valid for the life of the printed
 * document. What changes after the first successful use is the *behavior*:
 * `must_change_password` only flips to false once the parent actually
 * completes the forced password change (see changePassword()), so a scan
 * that happens before that (e.g. they closed the tab mid-flow) still counts
 * as "first time" and logs them straight in. Once the password has really
 * been changed, later scans stop auto-logging in — they redirect to a page
 * that asks for the password the parent chose, so the printed QR alone is no
 * longer sufficient on its own.
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
    .select("id, must_change_password")
    .eq("qr_login_token", token)
    .maybeSingle();
  if (!profile) return fail();

  if (!profile.must_change_password) {
    return NextResponse.redirect(new URL(`/qr-login/${token}`, origin));
  }

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

  return NextResponse.redirect(new URL("/changer-mot-de-passe", origin));
}
