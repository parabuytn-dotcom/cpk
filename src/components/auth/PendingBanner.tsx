import { getTranslations } from "next-intl/server";

export default async function PendingBanner() {
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto mt-4 max-w-6xl px-4">
      <div className="flex items-start gap-3 rounded-2xl border border-accent-500/30 bg-accent-400/10 px-4 py-3 text-sm text-accent-600 dark:text-accent-400">
        <span aria-hidden className="mt-0.5">
          ⏳
        </span>
        <p>{t("pendingBanner")}</p>
      </div>
    </div>
  );
}
