import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, rtlLocales, type Locale } from "@/i18n/routing";
import Navbar from "@/components/navbar/Navbar";
import { Link } from "@/i18n/navigation";
import PendingBanner from "@/components/auth/PendingBanner";
import ValidatedModal from "@/components/auth/ValidatedModal";
import OnboardingTour, { type TourStep } from "@/components/onboarding/OnboardingTour";
import { getCurrentProfile } from "@/lib/auth/session";
import ChatWidget from "@/components/assistant/ChatWidget";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-sans" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "CPK Learn — Collège Pilote du Kef",
    description:
      "Portail numérique du Collège Pilote du Kef pour parents, élèves et administration.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [profile, footer, nav] = await Promise.all([
    getCurrentProfile(),
    getTranslations("footer"),
    getTranslations("nav"),
  ]);

  const dir = rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";
  const font = locale === "ar" ? cairo : inter;
  const showOnboardingTour =
    Boolean(profile) && !profile!.onboardingTourSeen && !profile!.mustChangePassword;
  const showValidatedModal =
    profile?.status === "validated" && !profile.validationSeen && !showOnboardingTour;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${font.className} min-h-screen antialiased`}>
        <NextIntlClientProvider>
          <Navbar />
          {profile?.status === "pending" && <PendingBanner />}
          <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10">{children}</main>
          <footer className="border-t border-black/5 px-4 py-8 text-center text-sm text-foreground/60 dark:border-white/10">
            © {new Date().getFullYear()} Collège Pilote du Kef — {footer("rights")} ·{" "}
            <Link href="/aide" className="underline hover:text-foreground">
              {nav("help")}
            </Link>{" "}
            ·{" "}
            <Link href="/confidentialite" className="underline hover:text-foreground">
              {footer("privacy")}
            </Link>
          </footer>
          {showOnboardingTour && <OnboardingTourContainer />}
          {showValidatedModal && <ValidatedModalContainer />}
          <ChatWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function ValidatedModalContainer() {
  const t = await getTranslations("auth");
  return (
    <ValidatedModal
      title={t("validatedTitle")}
      body={t("validatedBody")}
      closeLabel={t("validatedClose")}
    />
  );
}

async function OnboardingTourContainer() {
  const t = await getTranslations("onboardingTour");

  const steps: TourStep[] = [
    { emoji: "👋", title: t("welcomeTitle"), body: t("welcomeBody"), from: "#818cf8", to: "#6366f1" },
    { emoji: "📋", title: t("dashboardTitle"), body: t("dashboardBody"), from: "#38bdf8", to: "#0ea5e9" },
    { emoji: "🗓️", title: t("timetableTitle"), body: t("timetableBody"), from: "#34d399", to: "#0d9488" },
    { emoji: "📚", title: t("homeworkTitle"), body: t("homeworkBody"), from: "#fbbf24", to: "#f97316" },
    { emoji: "📸", title: t("feedTitle"), body: t("feedBody"), from: "#f472b6", to: "#e11d48" },
    { emoji: "💡", title: t("ideasTitle"), body: t("ideasBody"), from: "#c084fc", to: "#a21caf" },
    { emoji: "🔔", title: t("notificationsTitle"), body: t("notificationsBody"), from: "#60a5fa", to: "#4f46e5" },
    { emoji: "🎉", title: t("finishTitle"), body: t("finishBody"), from: "#34d399", to: "#0d9488" },
  ];

  return (
    <OnboardingTour
      steps={steps}
      labels={{
        next: t("next"),
        previous: t("previous"),
        skip: t("skip"),
        start: t("start"),
      }}
    />
  );
}
