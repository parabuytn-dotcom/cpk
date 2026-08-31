import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import PageHeader from "@/components/ui/PageHeader";
import DonationForm from "@/components/donations/DonationForm";

export default async function DonationsPage({
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

  const t = await getTranslations("donations");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DonationForm />
      <p className="text-center text-xs text-foreground/50">{t("securedBy")}</p>
    </div>
  );
}
