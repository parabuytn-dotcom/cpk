import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import QrPasswordForm from "@/components/auth/QrPasswordForm";

// Looks up the account by its (durable, non-expiring) qr_login_token —
// state depends on live DB data, never build-time.
export const dynamic = "force-dynamic";

export default async function QrLoginPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const adminClient = createAdminClient();
  const { data: profile } = adminClient
    ? await adminClient
        .from("profiles")
        .select("full_name, parent_first_name")
        .eq("qr_login_token", token)
        .maybeSingle()
    : { data: null };

  if (!profile) {
    redirect({ href: "/login?qrError=1", locale });
    return null;
  }

  const displayName = profile.full_name ?? profile.parent_first_name;

  return (
    <div className="glass-surface mx-auto max-w-md rounded-3xl p-8">
      <h1 className="mb-2 text-2xl font-bold">
        {displayName ? `Bon retour, ${displayName} !` : "Bon retour !"}
      </h1>
      <p className="mb-6 text-sm text-foreground/60">
        Ce code QR a déjà servi à te connecter une première fois. Entre le mot de passe que tu as
        choisi pour continuer.
      </p>
      <QrPasswordForm token={token} />
    </div>
  );
}
