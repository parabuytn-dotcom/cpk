"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { routing, localeLabels, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function onSelect(nextLocale: Locale) {
    router.replace(
      // @ts-expect-error -- params shape depends on the current route
      { pathname, params },
      { locale: nextLocale },
    );
  }

  return (
    <div className="relative">
      <select
        aria-label="Langue / Language / اللغة"
        value={locale}
        onChange={(e) => onSelect(e.target.value as Locale)}
        className="cursor-pointer appearance-none rounded-full border border-white/30 bg-white/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-white/95 dark:bg-white/10 dark:hover:bg-white/20"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
