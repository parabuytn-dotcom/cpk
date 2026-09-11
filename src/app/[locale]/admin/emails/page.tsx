import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import EmailComposer from "@/components/admin/EmailComposer";
import { listClasses, listSentEmails } from "@/lib/admin/data";

export const dynamic = "force-dynamic";

export default async function AdminEmailsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [classes, sent] = await Promise.all([listClasses(), listSentEmails()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Emails"
        subtitle="Envoie un message personnalisé aux membres du site et/ou à des adresses externes."
      />

      <EmailComposer classes={classes} />

      {sent.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground/70">Derniers envois</h2>
          <div className="glass-surface flex flex-col divide-y divide-black/5 rounded-3xl px-5 dark:divide-white/10">
            {sent.map((mail) => (
              <div key={mail.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{mail.subject}</p>
                  <p className="truncate text-xs text-foreground/60">{mail.recipient}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground/50">
                    {new Date(mail.createdAt).toLocaleString("fr-FR")}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      mail.status === "sent"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {mail.status === "sent" ? "envoyé" : "échec"}
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
