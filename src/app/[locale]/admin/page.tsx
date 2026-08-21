import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const cards = [
    { href: "/admin/comptes", label: t("accounts") },
    { href: "/admin/emploi-du-temps", label: t("timetableTab") },
    { href: "/admin/absences", label: t("absencesTab") },
  ];

  return (
    <div>
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="glass-surface rounded-3xl px-6 py-10 text-center font-semibold transition hover:shadow-lg"
          >
            {card.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
