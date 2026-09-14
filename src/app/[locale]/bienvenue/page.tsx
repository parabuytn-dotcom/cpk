import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { getIntroVideo } from "@/lib/siteMedia";

const OPTIONS = [
  { method: "document", emoji: "🪪", href: "/scanner-qr" },
  { method: "creer", emoji: "➕", href: "/register" },
  { method: "connecter", emoji: "🔑", href: "/login" },
  { method: "enfant", emoji: "🎒", href: "/login?method=child" },
] as const;

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, video] = await Promise.all([getTranslations("onboarding"), getIntroVideo()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {video && (
        <Link
          href="/introducing"
          className="glass-surface mb-4 flex items-center gap-4 rounded-3xl px-6 py-5 transition hover:shadow-lg"
        >
          <span className="text-4xl" aria-hidden>
            ▶️
          </span>
          <span>
            <span className="block text-lg font-semibold">{t("watchTitle")}</span>
            <span className="block text-sm text-foreground/60">{t("watchSubtitle")}</span>
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <Link
            key={option.method}
            href={option.href}
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
