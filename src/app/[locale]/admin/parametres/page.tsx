import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSiteSetting } from "@/lib/admin/data";
import PageHeader from "@/components/ui/PageHeader";
import TrainingLinkForm from "@/components/admin/TrainingLinkForm";
import DownloadModeForm from "@/components/admin/DownloadModeForm";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, trainingUrl, downloadMode, playstoreUrl] = await Promise.all([
    getTranslations("admin"),
    getSiteSetting("training_url"),
    getSiteSetting("download_mode"),
    getSiteSetting("playstore_url"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("parametresTab")} subtitle={t("parametresSubtitle")} />
      <TrainingLinkForm initialValue={trainingUrl ?? ""} />
      <DownloadModeForm initialMode={downloadMode ?? "apk"} initialPlaystoreUrl={playstoreUrl ?? ""} />
    </div>
  );
}
