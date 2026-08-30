import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import QrScanner from "@/components/auth/QrScanner";

export default async function ScannerQrPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t("scanTitle")} />
      <QrScanner />
    </div>
  );
}
