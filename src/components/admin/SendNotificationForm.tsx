"use client";

import { useState, useTransition } from "react";
import {
  sendCustomNotification,
  type NotificationTargetKind,
} from "@/lib/notifications/adminActions";
import type { ClassRow, UserRow } from "@/lib/admin/data";

const ROLES = ["parent", "student", "teacher", "staff", "director", "admin"];

export default function SendNotificationForm({
  users,
  classes,
  tags,
  /** Pre-selects "this one person" mode, used from a user's history panel. */
  lockedUserId,
}: {
  users: UserRow[];
  classes: ClassRow[];
  tags: string[];
  lockedUserId?: string;
}) {
  const [targetKind, setTargetKind] = useState<NotificationTargetKind>(
    lockedUserId ? "user" : "class",
  );
  const [targetValue, setTargetValue] = useState(lockedUserId ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [intrusive, setIntrusive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  function submit() {
    setResult(null);
    startTransition(async () => {
      const res = await sendCustomNotification({
        targetKind,
        targetValue: lockedUserId ?? targetValue,
        title,
        message,
        link,
        intrusive,
      });
      if (res.success) {
        setResult({ ok: true, text: `Envoyé à ${res.recipients} personne(s).` });
        setTitle("");
        setMessage("");
        setLink("");
        setIntrusive(false);
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  }

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-3xl p-6">
      {!lockedUserId && (
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={targetKind}
            onChange={(e) => {
              setTargetKind(e.target.value as NotificationTargetKind);
              setTargetValue("");
            }}
            className={inputClass}
          >
            <option value="class">Une classe (élèves + parents)</option>
            <option value="role">Un rôle</option>
            <option value="tag">Un tag</option>
            <option value="user">Une personne</option>
            <option value="all">Tout le monde</option>
          </select>

          {targetKind === "class" && (
            <select
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className={inputClass}
            >
              <option value="">Choisir une classe…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {targetKind === "role" && (
            <select
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className={inputClass}
            >
              <option value="">Choisir un rôle…</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          {targetKind === "tag" && (
            <select
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className={inputClass}
            >
              <option value="">Choisir un tag…</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          {targetKind === "user" && (
            <select
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className={inputClass}
            >
              <option value="">Choisir une personne…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName ?? "—"} · {u.role}
                  {u.className ? ` · ${u.className}` : ""}
                </option>
              ))}
            </select>
          )}

          {targetKind === "all" && (
            <p className="self-center text-sm text-foreground/60">
              Tous les comptes de la plateforme.
            </p>
          )}
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre (facultatif — sert de titre à la fenêtre si notification intrusive)"
        className={inputClass}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        rows={3}
        className={inputClass}
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Lien (facultatif, ex: /emploi-du-temps)"
        className={inputClass}
      />

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={intrusive}
          onChange={(e) => setIntrusive(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Notification intrusive</span>
          <span className="block text-foreground/60">
            S&apos;affiche en fenêtre bloquante à la prochaine ouverture du site, comme le message
            de validation de compte — pas seulement dans la cloche.
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={isPending || !message.trim()}
        className="self-start rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? "Envoi…" : "Envoyer la notification"}
      </button>

      {result && (
        <p
          className={`text-sm ${
            result.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
