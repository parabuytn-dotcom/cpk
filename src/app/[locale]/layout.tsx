import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, rtlLocales, type Locale } from "@/i18n/routing";
import Navbar from "@/components/navbar/Navbar";
import PendingBanner from "@/components/auth/PendingBanner";
import ValidatedModal from "@/components/auth/ValidatedModal";
import { getCurrentProfile } from "@/lib/auth/session";
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

  const [profile, footer] = await Promise.all([
    getCurrentProfile(),
    getTranslations("footer"),
  ]);

  const dir = rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";
  const font = locale === "ar" ? cairo : inter;
  const showValidatedModal = profile?.status === "validated" && !profile.validationSeen;

  return (
    <html lang={locale} dir={dir}>
      <body className={`${font.className} min-h-screen antialiased`}>
        <NextIntlClientProvider>
          <Navbar />
          {profile?.status === "pending" && <PendingBanner />}
          <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-10">{children}</main>
          <footer className="border-t border-black/5 px-4 py-8 text-center text-sm text-foreground/60 dark:border-white/10">
            © {new Date().getFullYear()} Collège Pilote du Kef — {footer("rights")}
          </footer>
          {showValidatedModal && <ValidatedModalContainer />}
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
