import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";

export default async function DonationSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("donations");

  return (
    <div className="mx-auto max-w-md text-center">
      <PageHeader title={t("successTitle")} subtitle={t("successBody")} />
      <Link
        href="/"
        className="inline-block rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
