import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getSiteSetting } from "@/lib/admin/data";
import FirstVisitRedirect from "@/components/FirstVisitRedirect";
import DownloadAppButton from "@/components/DownloadAppButton";

// Whether to show the first-visit onboarding redirect depends on the
// signed-in state at request time — must not be baked in at build time.
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, profile, downloadMode, playstoreUrl] = await Promise.all([
    getTranslations("home"),
    getCurrentProfile(),
    getSiteSetting("download_mode"),
    getSiteSetting("playstore_url"),
  ]);

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      {!profile && <FirstVisitRedirect />}
      <span className="rounded-full bg-brand-500/10 px-4 py-1 text-sm font-medium text-brand-700 dark:text-brand-300">
cpkef.tn
      </span>
      <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-lg text-foreground/70">{t("subtitle")}</p>
      <Link
        href="/dashboard"
        className="rounded-full bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-3 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:shadow-xl"
      >
        {t("cta")}
      </Link>
      <DownloadAppButton
        downloadMode={downloadMode === "playstore" ? "playstore" : "apk"}
        playstoreUrl={playstoreUrl ?? ""}
      />
    </div>
  );
}
