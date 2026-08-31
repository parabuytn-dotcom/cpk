"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/ui/Avatar";
import JitsiCall from "./JitsiCall";
import { addGroupMember, removeGroupMember, deleteGroup, sendGroupMessage } from "@/lib/groups/actions";
import type { GroupDetail, ClassmateRow } from "@/lib/groups/data";
import { formatDateTime } from "@/lib/formatDate";

export default function GroupRoom({
  group,
  currentUserId,
  currentUserName,
  classmates,
  locale,
}: {
  group: GroupDetail;
  currentUserId: string;
  currentUserName: string;
  classmates: ClassmateRow[];
  locale: string;
}) {
  const t = useTranslations("groups");
  const router = useRouter();
  const [view, setView] = useState<"chat" | "call">("chat");
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedClassmate, setSelectedClassmate] = useState(classmates[0]?.userId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [msgState, sendAction, sendPending] = useActionState(sendGroupMessage, undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Lightweight "live enough" chat: re-fetch server data every few seconds
  // while the chat tab is open, instead of a full websocket subscription.
  useEffect(() => {
    if (view !== "chat") return;
    const interval = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(interval);
  }, [view, router]);

  useEffect(() => {
    if (msgState?.success !== undefined) formRef.current?.reset();
  }, [msgState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [group.messages.length]);

  function handleAddMember() {
    if (!selectedClassmate) return;
    setError(null);
    startTransition(async () => {
      try {
        await addGroupMember(group.id, selectedClassmate);
        setShowAddMember(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleRemoveMember(memberId: string) {
    const isSelf = memberId === currentUserId;
    if (!confirm(isSelf ? t("confirmLeave") : t("confirmRemoveMember"))) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeGroupMember(group.id, memberId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function handleDeleteGroup() {
    if (!confirm(t("confirmDeleteGroup"))) return;
    startTransition(async () => {
      try {
        await deleteGroup(group.id);
        router.push(`/${locale}/groupes`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/groupes" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← {t("backToGroups")}
      </Link>

      <div className="glass-surface flex flex-col gap-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-foreground/60">{group.className}</p>
          </div>
          {group.isOwner && (
            <button
              type="button"
              onClick={handleDeleteGroup}
              disabled={isPending}
              className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
            >
              {t("deleteGroup")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {group.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-2 rounded-full bg-black/5 py-1 pl-1 pr-3 dark:bg-white/10"
            >
              <Avatar name={member.name} photoUrl={member.avatarUrl} size={28} />
              <span className="text-sm font-medium">{member.name}</span>
              {member.role === "owner" && <span aria-hidden>👑</span>}
              {(group.isOwner || member.userId === currentUserId) && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.userId)}
                  disabled={isPending}
                  aria-label="Retirer"
                  className="text-foreground/40 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {group.isOwner && group.members.length < 6 && (
            <button
              type="button"
              onClick={() => setShowAddMember((v) => !v)}
              className="rounded-full border border-dashed border-black/20 px-4 py-1.5 text-sm font-medium text-foreground/60 transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {t("addMember")}
            </button>
          )}
        </div>

        {showAddMember && (
          <div className="flex flex-wrap items-center gap-2">
            {classmates.length === 0 ? (
              <p className="text-sm text-foreground/50">{t("allClassmatesAdded")}</p>
            ) : (
              <>
                <select
                  value={selectedClassmate}
                  onChange={(e) => setSelectedClassmate(e.target.value)}
                  className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                >
                  {classmates.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={isPending}
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {t("add")}
                </button>
              </>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("chat")}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            view === "chat"
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          💬 {t("chatTab")}
        </button>
        <button
          type="button"
          onClick={() => setView("call")}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            view === "call"
              ? "bg-brand-600 text-white shadow-md"
              : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          }`}
        >
          📹 {t("callTab")}
        </button>
      </div>

      {view === "call" ? (
        <JitsiCall roomSlug={group.roomSlug} displayName={currentUserName} onClose={() => setView("chat")} />
      ) : (
        <div className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
          <div className="flex max-h-[50vh] min-h-[30vh] flex-col gap-3 overflow-y-auto">
            {group.messages.length === 0 ? (
              <p className="m-auto text-sm text-foreground/50">{t("noMessages")}</p>
            ) : (
              group.messages.map((message) => {
                const isMine = message.authorId === currentUserId;
                return (
                  <div key={message.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                    <Avatar name={message.authorName} photoUrl={message.authorAvatarUrl} size={28} />
                    <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 text-sm ${
                          isMine
                            ? "bg-brand-600 text-white"
                            : "bg-black/5 text-foreground dark:bg-white/10"
                        }`}
                      >
                        {message.content}
                      </div>
                      <span className="mt-0.5 text-[11px] text-foreground/40">
                        {message.authorName} · {formatDateTime(locale, message.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form ref={formRef} action={sendAction} className="flex gap-2 border-t border-black/5 pt-3 dark:border-white/10">
            <input type="hidden" name="groupId" value={group.id} />
            <input
              name="content"
              placeholder={t("messagePlaceholder")}
              required
              className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
            />
            <button
              type="submit"
              disabled={sendPending}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {t("send")}
            </button>
          </form>
          {msgState?.message && <p className="text-sm text-red-600 dark:text-red-400">{msgState.message}</p>}
        </div>
      )}
    </div>
  );
}
