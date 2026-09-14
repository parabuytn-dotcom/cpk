import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSiteSetting } from "@/lib/admin/data";
import PageHeader from "@/components/ui/PageHeader";
import TrainingLinkForm from "@/components/admin/TrainingLinkForm";
import DownloadModeForm from "@/components/admin/DownloadModeForm";
import SmsVerificationToggleForm from "@/components/admin/SmsVerificationToggleForm";
import AbsenceEmailToggleForm from "@/components/admin/AbsenceEmailToggleForm";
import AdminVerificationForm from "@/components/admin/AdminVerificationForm";
import { getAdminVerificationSettings } from "@/lib/admin/adminVerification";
import IntroVideoForm from "@/components/admin/IntroVideoForm";
import AboutPhotosForm from "@/components/admin/AboutPhotosForm";
import {
  ABOUT_PEOPLE,
  INTRO_VIDEO_SOURCE_KEY,
  INTRO_VIDEO_VALUE_KEY,
  getAboutPhotos,
  type AboutPerson,
} from "@/lib/siteMedia";
import { SITE_URL } from "@/lib/siteUrl";

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

  const [introSource, introValue, aboutPhotos, ...uploadedPhotoPaths] = await Promise.all([
    getSiteSetting(INTRO_VIDEO_SOURCE_KEY),
    getSiteSetting(INTRO_VIDEO_VALUE_KEY),
    getAboutPhotos(),
    ...(Object.keys(ABOUT_PEOPLE) as AboutPerson[]).map((person) => getSiteSetting(ABOUT_PEOPLE[person].settingKey)),
  ]);
  const people = (Object.keys(ABOUT_PEOPLE) as AboutPerson[]).map((person, index) => ({
    key: person,
    name: ABOUT_PEOPLE[person].name,
    photoUrl: aboutPhotos[person],
    isUploaded: Boolean(uploadedPhotoPaths[index]),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("parametresTab")} subtitle={t("parametresSubtitle")} />
      <IntroVideoForm
        initialSource={introValue && (introSource === "upload" || introSource === "youtube") ? introSource : "none"}
        initialYoutubeId={introSource === "youtube" ? (introValue ?? "") : ""}
        pageUrl={`${SITE_URL}/introducing`}
      />
      <AboutPhotosForm people={people} />
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
