import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import Avatar from "@/components/ui/Avatar";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} />

      {/* TODO: remplacer photoUrl par le vrai chemin une fois les photos fournies
          (ex: Supabase Storage ou /public/images/melik.jpg). */}
      <div className="mb-8 flex justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <Avatar name="Melik Messaoudi" photoUrl={null} size={112} />
          <p className="text-sm font-medium">Melik Messaoudi</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar name="Edem Aifia" photoUrl={null} size={112} />
          <p className="text-sm font-medium">Edem Aifia</p>
        </div>
      </div>

      <p className="glass-surface rounded-3xl px-6 py-8 text-lg leading-relaxed text-foreground/85">
        {t("story")}
      </p>
    </div>
  );
}
