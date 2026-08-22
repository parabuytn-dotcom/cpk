import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listClasses } from "@/lib/admin/data";
import { listCourseResources } from "@/lib/vault/data";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ClassSelector from "@/components/admin/ClassSelector";
import ResourceUploadForm from "@/components/vault/ResourceUploadForm";
import ResourceRow from "@/components/vault/ResourceRow";

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ classId?: string }>;
}) {
  const { locale } = await params;
  const { classId } = await searchParams;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
    return null;
  }

  const [t, classes] = await Promise.all([getTranslations("vault"), listClasses()]);
  const selectedClass = classes.find((c) => c.id === classId);
  const resources = classId ? await listCourseResources(classId) : [];
  const canUpload = profile.role === "admin" || profile.tags.includes("scribe");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <ClassSelector classes={classes} currentClassId={classId} label={t("selectClass")} />

      {selectedClass && (
        <div className="flex flex-col gap-4">
          {canUpload && <ResourceUploadForm classRow={selectedClass} />}

          {resources.length === 0 ? (
            <EmptyState message={t("noResources")} />
          ) : (
            <div className="flex flex-col gap-3">
              {resources.map((r) => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  canDelete={profile.role === "admin" || profile.id === r.uploadedById}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
