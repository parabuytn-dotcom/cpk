"use client";

import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import type { InboxItem } from "@/lib/admin/data";
import {
  replyToHelpRequest,
  replyToInboxMessage,
  setHelpRequestStatus,
  setInboxMessageRead,
} from "@/lib/admin/inboxActions";
import { countSmsSegments } from "@/lib/smsSegments";

const KIND = {
  sms: { label: "SMS", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  email: { label: "Email", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  help: { label: "Aide", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
} as const;

const HELP_STATUSES = [
  ["open", "Nouvelle"],
  ["in_progress", "En cours"],
  ["closed", "Traitée"],
] as const;

export default function InboxItemCard({ item, receivedLabel }: { item: InboxItem; receivedLabel: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(item.unread);
  const [status, setStatus] = useState(item.status);
  const [reply, setReply] = useState("");
  const [sentReply, setSentReply] = useState<{ body: string } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const kind = KIND[item.kind];
  const title = item.subject || item.body.slice(0, 80);
  const shownReply = sentReply?.body ?? item.reply;

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening an SMS or email counts as reading it; help requests are "read"
    // only once their status moves, so opening one changes nothing.
    if (next && unread && item.kind !== "help") {
      setUnread(false);
      startTransition(async () => {
        await setInboxMessageRead(item.id, true);
      });
    }
  }

  function markUnread() {
    setUnread(true);
    startTransition(async () => {
      await setInboxMessageRead(item.id, false);
    });
  }

  function changeStatus(value: string) {
    setStatus(value);
    setUnread(value === "open");
    startTransition(async () => {
      await setHelpRequestStatus(item.id, value);
    });
  }

  function sendReply() {
    setFeedback(null);
    startTransition(async () => {
      const result =
        item.kind === "help"
          ? await replyToHelpRequest(item.id, reply)
          : await replyToInboxMessage(item.id, reply);
      if (result.success) {
        setSentReply({ body: reply.trim() });
        setReply("");
        setFeedback({ ok: true, text: result.message ?? "Réponse envoyée." });
        if (item.kind === "help" && status === "open") setStatus("in_progress");
        setUnread(false);
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  }

  const replyHint =
    item.kind === "sms"
      ? `Réponse par SMS · ${countSmsSegments(reply)} SMS`
      : item.kind === "email"
        ? "Réponse par email"
        : "Réponse envoyée à l'auteur en notification";

  return (
    <article
      className={`glass-surface overflow-hidden rounded-2xl transition ${unread ? "ring-1 ring-brand-500/40" : ""}`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <span
          aria-hidden
          className={`mt-2 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-brand-600" : "bg-transparent"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${kind.className}`}>
              {kind.label}
            </span>
            <span className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>
              {item.fromName ? `${item.fromName} · ${item.from}` : item.from}
            </span>
            {shownReply && (
              <span className="text-xs text-foreground/50">· répondu</span>
            )}
            <span className="ms-auto text-xs tabular-nums text-foreground/50">{receivedLabel}</span>
          </div>
          <p className={`mt-1 truncate text-sm ${unread ? "text-foreground" : "text-foreground/70"}`}>{title}</p>
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-black/5 px-5 py-4 dark:border-white/10">
          {item.subject && item.kind !== "sms" && <p className="font-semibold">{item.subject}</p>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60">
            {item.profileId ? (
              <Link href={`/admin/utilisateurs/${item.profileId}`} className="font-medium text-brand-600 hover:underline">
                Voir le compte
              </Link>
            ) : (
              item.kind !== "help" && <span>Aucun compte ne correspond à cet expéditeur</span>
            )}

            {item.kind === "help" ? (
              <label className="flex items-center gap-2">
                Statut
                <select
                  value={status ?? "open"}
                  disabled={isPending}
                  onChange={(e) => changeStatus(e.target.value)}
                  className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5"
                >
                  {HELP_STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              !unread && (
                <button type="button" onClick={markUnread} className="font-medium hover:underline">
                  Marquer comme non lu
                </button>
              )
            )}
          </div>

          {shownReply && (
            <div className="rounded-xl bg-brand-500/10 px-4 py-3 text-sm">
              <p className="mb-1 text-xs font-semibold text-foreground/60">Ta réponse</p>
              <p className="whitespace-pre-wrap">{shownReply}</p>
            </div>
          )}

          {(item.kind !== "help" || item.profileId) && (
            <div className="flex flex-col gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                maxLength={item.kind === "sms" ? 1000 : 10000}
                placeholder={shownReply ? "Envoyer une autre réponse…" : "Écrire une réponse…"}
                className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={isPending || !reply.trim()}
                  className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {isPending ? "Envoi…" : "Répondre"}
                </button>
                <span className="text-xs text-foreground/50">{replyHint}</span>
              </div>
            </div>
          )}

          {feedback && (
            <p className={`text-sm ${feedback.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {feedback.text}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
