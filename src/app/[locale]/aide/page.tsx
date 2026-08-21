import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import HelpForm from "@/components/HelpForm";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t("title")} />
      <HelpForm />
    </div>
  );
}
