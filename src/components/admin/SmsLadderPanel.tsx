"use client";

import { useState, useTransition } from "react";
import { forceSmsQueue } from "@/lib/admin/smsLadderActions";

type Props = {
  remaining: number | null;
  alertsLeft: number;
  pending: {
    id: string;
    kind: "makeup_session" | "teacher_absence";
    phone: string;
    message: string;
    segments: number;
    remindersSent: number;
    createdAt: string;
  }[];
  pendingCost: number;
  highlightForce: boolean;
  thresholds: { low: number; codeReserve: number; alertCount: number; reminderCount: number };
};

export default function SmsLadderPanel({ remaining, alertsLeft, pending, pendingCost, highlightForce, thresholds }: Props) {
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const low = remaining !== null && remaining < thresholds.low;
  const schoolFloor = thresholds.codeReserve + alertsLeft;
  const missing = remaining !== null ? Math.max(pendingCost + thresholds.low - remaining, 0) : 0;

  const tiers = [
    {
      label: "1. Codes de vérification",
      detail: `${thresholds.codeReserve} SMS réservés, jamais bloqués`,
      active: true,
    },
    {
      label: "2. Alertes de recharge",
      detail: `${thresholds.alertCount - alertsLeft}/${thresholds.alertCount} envoyées au téléphone de l'admin, une toutes les 20 min`,
      active: low,
    },
    {
      label: "3. Rattrapages, puis absences",
      detail:
        remaining === null
          ? "Aucun solde saisi : rien n'est retenu"
          : `Utilisables jusqu'à ${schoolFloor} SMS restants`,
      active: remaining === null || remaining > schoolFloor,
    },
  ];

  return (
    <section
      className={`glass-surface flex flex-col gap-4 rounded-3xl p-6 ${
        highlightForce && pending.length > 0 ? "ring-2 ring-amber-500" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Priorités des SMS</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            low ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-green-500/15 text-green-700 dark:text-green-400"
          }`}
        >
          {remaining === null ? "Solde non suivi" : low ? `Mode économie : moins de ${thresholds.low} SMS` : "Solde suffisant"}
        </span>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3">
        {tiers.map((tier) => (
          <li
            key={tier.label}
            className={`rounded-2xl px-4 py-3 text-sm ${
              tier.active ? "bg-black/5 dark:bg-white/10" : "bg-black/[0.02] text-foreground/50 dark:bg-white/[0.03]"
            }`}
          >
            <p className="font-semibold">{tier.label}</p>
            <p className="text-xs text-foreground/60">{tier.detail}</p>
          </li>
        ))}
      </ol>

      <p className="text-xs text-foreground/55">
        Un SMS de rattrapage ou d&apos;absence qui ne peut pas partir est mis en attente. Les familles concernées reçoivent
        alors une notification intrusive, puis un rappel toutes les 30 minutes pendant 6 heures ({thresholds.reminderCount}{" "}
        notifications). Après une recharge, la file part seule si le solde reste au-dessus de {thresholds.low} SMS ;
        sinon tu reçois un SMS indiquant combien il en manque, avec un lien vers ce bouton.
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucun SMS en attente.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <b>{pending.length}</b> SMS en attente ({pendingCost} SMS au forfait)
              {missing > 0 && remaining !== null && remaining >= thresholds.low && (
                <> · il manque <b>{missing}</b> SMS pour les envoyer en gardant {thresholds.low} SMS</>
              )}
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (!confirm("Envoyer les SMS en attente maintenant, même si le solde passe sous 100 ?")) return;
                startTransition(async () => setResult(await forceSmsQueue()));
              }}
              className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-60"
            >
              {isPending ? "Envoi…" : "Forcer l'envoi"}
            </button>
          </div>
          {result && (
            <p className={`text-sm ${result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {result.message}
            </p>
          )}
          <ul className="flex max-h-72 flex-col divide-y divide-black/5 overflow-y-auto rounded-2xl bg-black/[0.03] px-4 dark:divide-white/10 dark:bg-white/5">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate">
                  <b>{item.kind === "makeup_session" ? "Rattrapage" : "Absence"}</b> · {item.phone} · {item.message}
                </span>
                <span className="text-foreground/50">
                  rappels {item.remindersSent}/{thresholds.reminderCount} ·{" "}
                  {new Date(item.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
