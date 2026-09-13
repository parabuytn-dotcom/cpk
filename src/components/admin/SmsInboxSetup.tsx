"use client";

import { useState, useTransition } from "react";
import { enableSmsInbox, type SmsInboxStatus } from "@/lib/admin/inboxActions";

export default function SmsInboxSetup({ status }: { status: SmsInboxStatus }) {
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const active = status.state === "active" || result?.ok;

  function enable() {
    setResult(null);
    startTransition(async () => {
      const res = await enableSmsInbox();
      setResult(res.success ? { ok: true, text: res.message ?? "Activée." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${active ? "bg-green-500" : "bg-amber-500"}`}
          aria-hidden
        />
        <p className="text-sm font-medium">
          Réception des SMS : {active ? "active" : "inactive"}
        </p>
        {!active && (
          <button
            type="button"
            onClick={enable}
            disabled={isPending}
            className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? "Activation…" : "Activer"}
          </button>
        )}
      </div>

      {status.state === "missing_key" && !result && (
        <p className="text-xs text-foreground/60">
          Étape préalable : dans l&apos;app SMS Gateway du téléphone, ouvre <b>Settings &gt; Webhooks</b>, copie la{" "}
          <b>Signing Key</b>, ajoute-la dans Vercel sous le nom <code>SMS_WEBHOOK_SIGNING_KEY</code>, puis redéploie.
        </p>
      )}
      {status.state === "error" && !result && (
        <p className="text-xs text-red-600 dark:text-red-400">Passerelle injoignable : {status.error}</p>
      )}
      {result && (
        <p className={`text-xs ${result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
