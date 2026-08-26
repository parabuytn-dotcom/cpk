import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";

const DESTINATIONS = {
  document: "/login?method=phone",
  creer: "/register",
  connecter: "/login",
  enfant: "/login?method=child",
} as const;

type Method = keyof typeof DESTINATIONS;

function isMethod(value: string): value is Method {
  return value in DESTINATIONS;
}

export default async function OnboardingTutorialPage({
  params,
}: {
  params: Promise<{ locale: string; method: string }>;
}) {
  const { locale, method } = await params;
  setRequestLocale(locale);

  if (!isMethod(method)) notFound();

  const t = await getTranslations("onboarding");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("tutorialTitle")} subtitle={t(`option.${method}.title`)} />

      {/* TODO: remplacer ce placeholder par <video src="/tutoriels/<method>.mp4" controls
          className="h-full w-full rounded-3xl object-cover" /> une fois la vidéo fournie. */}
      <div className="glass-surface mb-8 flex aspect-video items-center justify-center rounded-3xl text-center">
        <div className="flex flex-col items-center gap-3 px-6">
          <span className="text-5xl">🎬</span>
          <p className="text-sm text-foreground/60">{t("tutorialComingSoon")}</p>
        </div>
      </div>

      <div className="flex justify-center">
        <Link
          href={DESTINATIONS[method]}
          className="rounded-full bg-brand-600 px-8 py-3 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:shadow-xl"
        >
          {t("skip")}
        </Link>
      </div>
    </div>
  );
}
