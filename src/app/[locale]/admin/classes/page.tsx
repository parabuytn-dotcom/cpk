import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import CreateClassForm from "@/components/admin/CreateClassForm";
import ClassEditRow from "@/components/admin/ClassEditRow";
import { listClasses } from "@/lib/admin/data";

export default async function AdminClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, classes] = await Promise.all([getTranslations("admin"), listClasses()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("classesTab")} />
      <CreateClassForm />
      {classes.length === 0 ? (
        <EmptyState message={t("classesEmpty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((c) => (
            <ClassEditRow key={c.id} classRow={c} />
          ))}
        </div>
      )}
    </div>
  );
}
