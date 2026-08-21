import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />
      <p className="glass-surface rounded-3xl px-6 py-8 text-lg leading-relaxed text-foreground/85">
        {t("story")}
      </p>
    </div>
  );
}
