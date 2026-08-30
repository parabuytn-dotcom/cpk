import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import DocumentAccountsForm from "@/components/admin/DocumentAccountsForm";
import { listClasses } from "@/lib/admin/data";

export default async function AdminDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const classes = await listClasses();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Documents (fiches de connexion)"
        subtitle="Crée des comptes parents en lot et imprime une fiche par personne (nom, identifiant, mot de passe, QR code) — 3 par page A4."
      />
      <DocumentAccountsForm classes={classes} />
    </div>
  );
}
