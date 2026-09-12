import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { confirmDonation } from "@/lib/donations/confirm";

// The return trip settles the donation as well as the webhook does, so a
// delayed or undelivered webhook can't leave a paid donation stuck as
// pending. confirmDonation() is idempotent, so whichever arrives first wins.
export const dynamic = "force-dynamic";

export default async function DonationSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ don?: string }>;
}) {
  const { locale } = await params;
  const { don } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("donations");

  if (don) await confirmDonation(don);

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
