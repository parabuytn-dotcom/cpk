const LOCALE_TAG: Record<string, string> = { fr: "fr-FR", ar: "ar-TN", en: "en-US" };

export function formatDateTime(locale: string, iso: string) {
  return new Date(iso).toLocaleString(LOCALE_TAG[locale] ?? locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(locale: string, iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE_TAG[locale] ?? locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const JUST_NOW: Record<string, string> = { fr: "à l'instant", ar: "الآن", en: "just now" };

// Instagram-style relative timestamps ("2 h", "3 j"...) for the feed.
export function formatRelativeTime(locale: string, iso: string) {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 45) return JUST_NOW[locale] ?? JUST_NOW.en;

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  const rtf = new Intl.RelativeTimeFormat(LOCALE_TAG[locale] ?? locale, {
    numeric: "always",
    style: "short",
  });

  for (const [unit, secondsInUnit] of units) {
    if (diffSec >= secondsInUnit) {
      return rtf.format(-Math.floor(diffSec / secondsInUnit), unit);
    }
  }
  return JUST_NOW[locale] ?? JUST_NOW.en;
}
