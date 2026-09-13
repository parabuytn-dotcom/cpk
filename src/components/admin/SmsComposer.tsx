"use client";

import { useRef, useState, useTransition } from "react";
import { sendBulkSms, type SmsSendResult } from "@/lib/admin/smsActions";
import type { ClassRow } from "@/lib/admin/data";
import { countSmsSegments } from "@/lib/smsSegments";

const AUDIENCES = [
  { value: "all", label: "Tout le monde (membres du site)" },
  { value: "parents", label: "Parents" },
  { value: "teachers", label: "Professeurs" },
  { value: "students", label: "Élèves" },
  { value: "class", label: "Une classe (élèves + parents)" },
  { value: "tag", label: "Par tag" },
  { value: "manual", label: "Uniquement des numéros saisis à la main" },
] as const;

export default function SmsComposer({ classes }: { classes: ClassRow[] }) {
  const [audience, setAudience] = useState<string>("manual");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<SmsSendResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await sendBulkSms(formData);
      setResult(res);
      if (res.success) {
        formRef.current?.reset();
        setMessage("");
      }
    });
  }

  const segments = countSmsSegments(message);

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5";

  return (
    <form ref={formRef} action={handleSubmit} className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Destinataires</label>
        <select
          name="audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className={inputClass}
        >
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {audience === "class" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Classe</label>
          <select name="classId" required className={inputClass}>
            <option value="">—</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {audience === "tag" && (
        <div>
          <label className="mb-1 block text-sm font-medium">Tag</label>
          <input name="tag" required placeholder="feed_publisher" className={inputClass} />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Numéros saisis à la main {audience === "manual" ? "" : "(en plus de la sélection)"}
        </label>
        <textarea
          name="extraPhones"
          rows={2}
          placeholder="99766801, 22334455"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-foreground/50">
          8 chiffres, séparés par des virgules, des points-virgules ou des retours à la ligne.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Message</label>
        <textarea
          name="message"
          rows={5}
          required
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-foreground/50">
          {message.length} caractère{message.length !== 1 ? "s" : ""} · {segments} SMS par destinataire
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? "Envoi en cours…" : "Envoyer"}
      </button>

      {result && !result.success && (
        <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
      {result && result.success && (
        <div className="flex flex-col gap-1">
          <p
            className={
              result.sent > 0
                ? "text-sm text-green-600 dark:text-green-400"
                : "text-sm text-red-600 dark:text-red-400"
            }
          >
            {result.sent} SMS envoyé(s)
            {result.failed > 0 ? ` · ${result.failed} échec(s)` : ""}
            {result.skipped > 0
              ? ` · ${result.skipped} destinataire(s) ignoré(s) faute de numéro valide`
              : ""}
            .
          </p>
          {result.failed > 0 && result.lastError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Raison de l&apos;échec (passerelle SMS) : {result.lastError}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
