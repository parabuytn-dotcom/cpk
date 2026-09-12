import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import SmsComposer from "@/components/admin/SmsComposer";
import { listClasses, listSentSms } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

const TRIGGER_LABELS: Record<string, string> = {
  teacher_absence: "Absence prof",
  generated_password: "Mot de passe",
  phone_verification: "Vérification",
  manual: "Manuel",
};

export default async function AdminSmsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [classes, sent] = await Promise.all([listClasses(), listSentSms()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SMS"
        subtitle="Envoie un SMS aux membres du site et/ou à des numéros externes, via la passerelle du collège."
      />

      <SmsComposer classes={classes} />

      {sent.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground/70">Derniers envois (tous types confondus)</h2>
          <div className="glass-surface flex flex-col divide-y divide-black/5 rounded-3xl px-5 dark:divide-white/10">
            {sent.map((sms) => (
              <div key={sms.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{sms.phone}</p>
                  <p className="truncate text-xs text-foreground/60">{sms.message}</p>
                  {sms.status === "failed" && sms.error && (
                    <p className="truncate text-xs text-red-600 dark:text-red-400">{sms.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-foreground/60 dark:bg-white/10">
                    {TRIGGER_LABELS[sms.trigger] ?? sms.trigger}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {new Date(sms.createdAt).toLocaleString("fr-FR")}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      sms.status === "sent"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {sms.status === "sent" ? "envoyé" : "échec"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
