import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";

const OPTIONS = [
  { method: "document", emoji: "🪪" },
  { method: "creer", emoji: "➕" },
  { method: "connecter", emoji: "🔑" },
  { method: "enfant", emoji: "🎒" },
] as const;

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <Link
            key={option.method}
            href={`/bienvenue/tutoriel/${option.method}`}
            className="glass-surface flex flex-col gap-2 rounded-3xl px-6 py-8 text-center transition hover:shadow-lg"
          >
            <span className="text-4xl">{option.emoji}</span>
            <p className="text-lg font-semibold">{t(`option.${option.method}.title`)}</p>
            <p className="text-sm text-foreground/60">{t(`option.${option.method}.subtitle`)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
