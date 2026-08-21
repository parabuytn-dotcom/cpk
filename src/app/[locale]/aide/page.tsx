import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");

  // TODO: wire this form to a Server Action inserting into `help_requests`,
  // surfaced in the admin dashboard's Help queue (Phase 4).
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={t("title")} />
      <form className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("subject")}</label>
          <input
            name="subject"
            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("description")}</label>
          <textarea
            name="description"
            rows={5}
            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
          />
        </div>
        <button
          type="submit"
          disabled
          className="rounded-full bg-brand-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("submit")}
        </button>
      </form>
    </div>
  );
}
