import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

// Reflects per-request session/must_change_password state — must not be
// baked in at build time (same reasoning as /login and /register).
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  return (
    <div className="glass-surface mx-auto max-w-md rounded-3xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Choisis un nouveau mot de passe</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Pour ta sécurité, remplace le mot de passe imprimé sur ta fiche par un mot de passe que
        toi seul(e) connais.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
