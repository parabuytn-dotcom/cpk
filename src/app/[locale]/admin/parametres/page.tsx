import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSiteSetting } from "@/lib/admin/data";
import PageHeader from "@/components/ui/PageHeader";
import TrainingLinkForm from "@/components/admin/TrainingLinkForm";
import DownloadModeForm from "@/components/admin/DownloadModeForm";
import SmsVerificationToggleForm from "@/components/admin/SmsVerificationToggleForm";
import AbsenceEmailToggleForm from "@/components/admin/AbsenceEmailToggleForm";
import AdminVerificationForm from "@/components/admin/AdminVerificationForm";
import { getAdminVerificationSettings } from "@/lib/admin/adminVerification";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, trainingUrl, downloadMode, playstoreUrl, smsVerificationEnabled, absenceEmailEnabled, adminVerification] =
    await Promise.all([
      getTranslations("admin"),
      getSiteSetting("training_url"),
      getSiteSetting("download_mode"),
      getSiteSetting("playstore_url"),
      getSiteSetting("sms_verification_enabled"),
      getSiteSetting("absence_email_enabled"),
      getAdminVerificationSettings(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("parametresTab")} subtitle={t("parametresSubtitle")} />
      <TrainingLinkForm initialValue={trainingUrl ?? ""} />
      <DownloadModeForm initialMode={downloadMode ?? "apk"} initialPlaystoreUrl={playstoreUrl ?? ""} />
      <SmsVerificationToggleForm initialEnabled={smsVerificationEnabled === "true"} />
      <AbsenceEmailToggleForm initialEnabled={absenceEmailEnabled !== "false"} />
      <AdminVerificationForm
        initialEnabled={adminVerification.enabled}
        initialPhone={adminVerification.phone}
      />
    </div>
  );
}
