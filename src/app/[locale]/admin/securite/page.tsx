import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import SecurityFactors from "@/components/admin/SecurityFactors";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sécurité"
        subtitle="Protection du compte administrateur."
      />

      <SecurityFactors />

      <div className="glass-surface flex flex-col gap-2 rounded-3xl p-6 text-sm text-foreground/70">
        <h2 className="font-semibold text-foreground">Bonnes pratiques</h2>
        <p>
          • Dès qu&apos;une vérification biométrique est enregistrée, elle devient{" "}
          <strong>obligatoire</strong> pour entrer dans l&apos;espace administration : le mot de
          passe seul ne suffit plus.
        </p>
        <p>
          • Enregistre-la sur <strong>au moins deux appareils</strong> (par exemple ton téléphone et
          ton ordinateur). Une clé biométrique est liée à l&apos;appareil : si tu perds le seul
          appareil enregistré, tu perds l&apos;accès admin.
        </p>
        <p>
          • Une clé <strong>Face ID est liée au domaine</strong>. Au passage à cpkef.tn, il faudra
          la ré-enregistrer. L&apos;application d&apos;authentification, elle, continuera de
          fonctionner.
        </p>
        <p>
          • Si Face ID refuse de s&apos;enregistrer (« MFA enroll is disabled for WebAuthn »),
          active-le dans le dashboard Supabase : <strong>Authentication → Multi-Factor
          Authentication → WebAuthn</strong>. C&apos;est une fonctionnalité encore en beta, donc
          désactivée par défaut sur les projets. En attendant, l&apos;application
          d&apos;authentification protège ton compte tout aussi efficacement.
        </p>
      </div>
    </div>
  );
}
