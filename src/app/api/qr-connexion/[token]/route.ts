import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges a one-time login QR token (generated from /admin/utilisateurs/[id]
 * for a single parent or teacher) for a real Supabase session. Unlike the
 * long-lived /api/qr-login used by the printed "document" accounts, this
 * token is claimed atomically (`used_at is null` in the update's WHERE
 * clause) the moment it's scanned, so a second scan of the same code — or a
 * race between two simultaneous scans — always fails past this point,
 * regardless of whether the recipient ever finishes changing their password.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { origin } = request.nextUrl;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?qrError=${reason}`, origin));

  const adminClient = createAdminClient();
  if (!adminClient) return fail("config");

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: qrToken } = await adminClient
    .from("login_qr_tokens")
    .select("id, user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!qrToken) return fail("invalid");
  if (qrToken.used_at) return fail("used");
  if (new Date(qrToken.expires_at) < new Date()) return fail("expired");

  // Atomic claim: only succeeds if nothing has consumed this row yet.
  const { data: claimed } = await adminClient
    .from("login_qr_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", qrToken.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return fail("used");

  await adminClient
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", qrToken.user_id);

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    qrToken.user_id,
  );
  const email = userData.user?.email;
  if (userError || !email) return fail("invalid");

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) return fail("invalid");

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: hashedToken,
    type: "email",
  });
  if (verifyError) return fail("invalid");

  return NextResponse.redirect(new URL("/changer-mot-de-passe", origin));
}
