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
          • Une clé est aussi liée au <strong>domaine</strong>. Au passage à cpkef.tn, il faudra la
          ré-enregistrer depuis le nouveau domaine.
        </p>
      </div>
    </div>
  );
}
