import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";
import { getSiteSetting } from "@/lib/admin/data";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, trainingUrl] = await Promise.all([
    getTranslations("about"),
    getSiteSetting("training_url"),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />

      <div className="mb-8 flex justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Avatar name="Melik Messaoudi" photoUrl="/melik-messaoudi.jpg" size={112} />
          <p className="text-sm font-medium">Melik Messaoudi</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar name="Edem Aifia" photoUrl="/edem-aifia.jpg" size={112} />
          <p className="text-sm font-medium">Edem Aifia</p>
        </div>
      </div>

      <p className="glass-surface rounded-3xl px-6 py-8 text-lg leading-relaxed text-foreground/85">
        {t("story")}
      </p>

      {trainingUrl && (
        <a
          href={trainingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-surface mt-6 flex flex-col gap-2 rounded-3xl px-6 py-6 text-center transition hover:shadow-lg"
        >
          <p className="text-lg font-semibold">{t("trainingTitle")}</p>
          <p className="text-sm text-foreground/70">{t("trainingDescription")}</p>
        </a>
      )}
    </div>
  );
}
