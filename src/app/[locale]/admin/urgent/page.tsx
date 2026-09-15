import { setRequestLocale } from "next-intl/server";
import PageHeader from "@/components/ui/PageHeader";
import UrgentComposer from "@/components/admin/UrgentComposer";
import CancelUrgentButton from "@/components/admin/CancelUrgentButton";
import { listClasses } from "@/lib/admin/data";
import { listUrgentBroadcasts, type UrgentDeliveryRow } from "@/lib/urgent/data";
import { formatSchoolDateTime } from "@/lib/schoolTime";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS = { notification: "🔔 Notification", sms: "💬 SMS", email: "✉️ Email" } as const;

function deliveryText(d: UrgentDeliveryRow) {
  const when = formatSchoolDateTime(d.runAt, "fr-FR", { hour: "2-digit", minute: "2-digit" });
  const round = d.rounds > 1 ? ` ${d.round}/${d.rounds}` : "";
  if (d.status === "pending") return { tone: "muted", text: `${round.trim() || "envoi"} prévu à ${when}` };
  if (d.status === "running") return { tone: "muted", text: `${round.trim() || "envoi"} en cours…` };
  if (d.status === "cancelled") return { tone: "muted", text: `${round.trim() || "envoi"} annulé` };
  const counts = [`${d.sent} envoyé(s)`, d.failed > 0 && `${d.failed} échec(s)`, d.skipped > 0 && `${d.skipped} non envoyé(s)`]
    .filter(Boolean)
    .join(", ");
  return { tone: d.failed > 0 || d.skipped > 0 ? "warn" : "ok", text: `${round.trim() ? `${round.trim()} · ` : ""}${when} · ${counts}` };
}

export default async function AdminUrgentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [classes, broadcasts] = await Promise.all([listClasses(), listUrgentBroadcasts()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="🚨 Message urgent"
        subtitle="Un même message envoyé en une fois par notification, SMS et email. Répète les SMS et les notifications au rythme de ton choix, ou retire les moyens dont tu n'as pas besoin."
      />

      <UrgentComposer classes={classes} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        {broadcasts.length === 0 ? (
          <p className="text-sm text-foreground/60">Aucun message urgent envoyé pour le moment.</p>
        ) : (
          broadcasts.map((b) => {
            const remaining = b.deliveries.filter((d) => d.status === "pending").length;
            const channels = (["notification", "sms", "email"] as const).filter((c) =>
              b.deliveries.some((d) => d.channel === c),
            );
            return (
              <article key={b.id} className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{b.subject}</p>
                    <p className="text-xs text-foreground/55">
                      {formatSchoolDateTime(b.createdAt)} · {b.audienceLabel} · {b.recipients} personne(s)
                      {b.cancelledAt && " · envois restants annulés"}
                    </p>
                  </div>
                  {remaining > 0 && <CancelUrgentButton broadcastId={b.id} remaining={remaining} />}
                </div>
                <p className="whitespace-pre-line text-sm text-foreground/80">{b.message}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {channels.map((channel) => (
                    <div key={channel} className="rounded-2xl bg-black/[0.04] px-3 py-2 dark:bg-white/5">
                      <p className="text-xs font-semibold">{CHANNEL_LABELS[channel]}</p>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {b.deliveries
                          .filter((d) => d.channel === channel)
                          .map((d) => {
                            const { tone, text } = deliveryText(d);
                            return (
                              <li
                                key={d.id}
                                title={d.error ?? undefined}
                                className={`text-xs tabular-nums ${
                                  tone === "ok"
                                    ? "text-green-700 dark:text-green-400"
                                    : tone === "warn"
                                      ? "text-amber-700 dark:text-amber-400"
                                      : "text-foreground/55"
                                }`}
                              >
                                {text}
                                {d.error && tone === "warn" && <span className="block truncate text-foreground/50">{d.error}</span>}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
