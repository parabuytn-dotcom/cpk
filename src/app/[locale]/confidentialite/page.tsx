import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />
      <div className="glass-surface flex flex-col gap-6 rounded-3xl px-6 py-8 text-foreground/85">
        <p>{t("intro")}</p>

        <div>
          <h2 className="mb-2 font-semibold">{t("collectedTitle")}</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>{t("collected1")}</li>
            <li>{t("collected2")}</li>
            <li>{t("collected3")}</li>
            <li>{t("collected4")}</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-semibold">{t("purposeTitle")}</h2>
          <p>{t("purpose")}</p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold">{t("contactTitle")}</h2>
          <p>{t("contact")}</p>
        </div>
      </div>
    </div>
  );
}
