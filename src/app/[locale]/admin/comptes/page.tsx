import { getTranslations, setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { listPendingProfiles } from "@/lib/admin/data";
import { validateAccount } from "@/lib/admin/actions";

export default async function AdminAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, pending] = await Promise.all([
    getTranslations("admin"),
    listPendingProfiles(),
  ]);

  return (
    <div>
      <PageHeader title={t("accounts")} subtitle={t("accountsSubtitle")} />

      {pending.length === 0 ? (
        <EmptyState message={t("accountsEmpty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4"
            >
              <div>
                <p className="font-semibold">
                  {p.parentFirstName} {p.parentLastName}
                </p>
                <p className="text-sm text-foreground/60">
                  CIN: {p.cin ?? "—"} · {p.registrationMethod}
                </p>
              </div>
              <form action={validateAccount.bind(null, p.id)}>
                <button
                  type="submit"
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
                >
                  {t("validate")}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
