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
