import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/ui/Avatar";
import IntroVideoPlayer from "@/components/IntroVideoPlayer";
import { getAboutPhotos, getIntroVideo } from "@/lib/siteMedia";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "introducing" });
  return { title: t("title"), description: t("subtitle") };
}

const FEATURES = ["timetable", "absences", "homework"] as const;

export default async function IntroducingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, video, photos] = await Promise.all([
    getTranslations("introducing"),
    getIntroVideo(),
    getAboutPhotos(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight [text-wrap:balance] sm:text-4xl">{t("title")}</h1>
        <p className="mx-auto max-w-xl text-foreground/70 [text-wrap:balance]">{t("subtitle")}</p>
      </header>

      {video ? (
        <IntroVideoPlayer video={video} title={t("title")} />
      ) : (
        <div className="glass-surface flex aspect-video flex-col items-center justify-center gap-3 rounded-3xl px-6 text-center">
          <span className="text-5xl" aria-hidden>
            🎬
          </span>
          <p className="text-sm text-foreground/60">{t("videoSoon")}</p>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature} className="glass-surface flex flex-col gap-1 rounded-2xl px-5 py-4">
            <p className="font-semibold">{t(`features.${feature}.title`)}</p>
            <p className="text-sm text-foreground/65">{t(`features.${feature}.body`)}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/register"
          className="w-full rounded-full bg-brand-600 px-8 py-3 text-center font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 sm:w-auto"
        >
          {t("register")}
        </Link>
        <Link
          href="/scanner-qr"
          className="w-full rounded-full border border-black/10 px-8 py-3 text-center font-semibold transition hover:bg-black/5 sm:w-auto dark:border-white/10 dark:hover:bg-white/10"
        >
          {t("scan")}
        </Link>
        <Link
          href="/login"
          className="w-full rounded-full px-6 py-3 text-center font-semibold text-brand-700 transition hover:underline sm:w-auto dark:text-brand-300"
        >
          {t("login")}
        </Link>
      </section>

      <footer className="glass-surface flex flex-col items-center gap-4 rounded-3xl px-6 py-6 text-center">
        <div className="flex -space-x-3 rtl:space-x-reverse">
          <Avatar name="Melik Messaoudi" photoUrl={photos.melik} size={56} />
          <Avatar name="Edem Aifia" photoUrl={photos.edem} size={56} />
        </div>
        <p className="text-sm text-foreground/75">{t("credits")}</p>
        <p className="text-xs text-foreground/50">{t("privacy")}</p>
      </footer>
    </div>
  );
}
