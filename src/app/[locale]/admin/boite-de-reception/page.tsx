import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import InboxItemCard from "@/components/admin/InboxItemCard";
import SmsInboxSetup from "@/components/admin/SmsInboxSetup";
import { countUnreadInbox, listInbox, type InboxKind } from "@/lib/admin/data";
import { getSmsInboxStatus } from "@/lib/admin/inboxActions";
import { formatDateTime } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

const FILTERS: { value: InboxKind | null; param: string | null; label: string }[] = [
  { value: null, param: null, label: "Tout" },
  { value: "sms", param: "sms", label: "SMS" },
  { value: "email", param: "email", label: "Emails" },
  { value: "help", param: "aide", label: "Aide" },
];

export default async function AdminInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filtre?: string }>;
}) {
  const { locale } = await params;
  const { filtre } = await searchParams;
  setRequestLocale(locale);

  const active = FILTERS.find((f) => f.param === filtre) ?? FILTERS[0];
  const [items, unread, smsStatus] = await Promise.all([
    listInbox(active.value ?? undefined),
    countUnreadInbox(),
    getSmsInboxStatus(),
  ]);

  const unreadFor = (kind: InboxKind | null) =>
    kind === null ? unread.total : kind === "sms" ? unread.sms : kind === "email" ? unread.email : unread.help;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Boîte de réception"
        subtitle="Les SMS reçus sur la ligne du collège, les emails reçus et les demandes d'aide, au même endroit."
      />

      <details className="glass-surface group rounded-3xl px-6 py-4">
        <summary className="cursor-pointer select-none text-sm font-semibold">Réception des messages</summary>
        <div className="mt-4 flex flex-col gap-5">
          <SmsInboxSetup status={smsStatus} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-foreground/30" aria-hidden />
              <p className="text-sm font-medium">Réception des emails : en attente du domaine cpkef.tn</p>
            </div>
            <p className="text-xs text-foreground/60">
              Tout est prêt côté site. Brevo ne peut recevoir des emails que pour un domaine qui vous appartient : ce sera
              activé une fois cpkef.tn en place, avec une copie des messages de contact@cpkef.tn transmise ici.
            </p>
          </div>
        </div>
      </details>

      <nav aria-label="Filtrer les messages" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count = unreadFor(filter.value);
          const selected = filter === active;
          return (
            <Link
              key={filter.label}
              href={filter.param ? `/admin/boite-de-reception?filtre=${filter.param}` : "/admin/boite-de-reception"}
              aria-current={selected ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-brand-600 text-white shadow-md"
                  : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
              }`}
            >
              {filter.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    selected ? "bg-white/25" : "bg-brand-600 text-white"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <EmptyState message="Aucun message pour le moment." />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <InboxItemCard
              key={`${item.kind}-${item.id}`}
              item={item}
              receivedLabel={formatDateTime(locale, item.receivedAt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
