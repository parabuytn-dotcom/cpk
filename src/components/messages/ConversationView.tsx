"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/ui/Avatar";
import MiroTalkCall from "@/components/groups/MiroTalkCall";
import ReportUserDialog from "./ReportUserDialog";
import { sendDirectMessage, markConversationRead, setBlocked } from "@/lib/messages/actions";
import type { ConversationDetail } from "@/lib/messages/data";
import { formatDateTime } from "@/lib/formatDate";

export default function ConversationView({
  conversation,
  currentUserId,
  currentUserName,
  locale,
}: {
  conversation: ConversationDetail;
  currentUserId: string;
  currentUserName: string;
  locale: string;
}) {
  const t = useTranslations("messages");
  const router = useRouter();
  const [view, setView] = useState<"chat" | "call">("chat");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [state, action, pending] = useActionState(sendDirectMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const blocked = conversation.isBlockedByMe || conversation.isBlockedByThem;
  const canChat = conversation.areFriends && !blocked;

  // Same "live enough" approach as the group chat: a short poll while the
  // conversation is open, rather than a realtime subscription.
  useEffect(() => {
    if (!canChat || view !== "chat") return;
    const interval = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(interval);
  }, [canChat, view, router]);

  useEffect(() => {
    if (!canChat) return;
    markConversationRead(conversation.friend.userId);
  }, [canChat, conversation.friend.userId]);

  useEffect(() => {
    if (state?.success !== undefined) formRef.current?.reset();
  }, [state]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.messages.length]);

  function toggleBlock() {
    setError(null);
    startTransition(async () => {
      try {
        await setBlocked(conversation.friend.userId, !conversation.isBlockedByMe);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  const tabClass = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-brand-600 text-white shadow-md"
        : "bg-black/5 text-foreground/70 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
    }`;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/messages" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
        ← {t("backToList")}
      </Link>

      <div className="glass-surface flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5">
        <Link href={`/profil/${conversation.friend.userId}`} className="flex items-center gap-3">
          <Avatar name={conversation.friend.name} photoUrl={conversation.friend.avatarUrl} size={44} />
          <span className="text-lg font-semibold">{conversation.friend.name}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ReportUserDialog userId={conversation.friend.userId} />
          <button
            type="button"
            onClick={toggleBlock}
            disabled={isPending}
            className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-medium text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
          >
            {conversation.isBlockedByMe ? t("unblock") : t("block")}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!conversation.areFriends && (
        <div className="glass-surface rounded-3xl p-8 text-center text-sm text-foreground/70">
          {t("notFriends")}
        </div>
      )}

      {conversation.areFriends && conversation.isBlockedByMe && (
        <div className="glass-surface rounded-3xl p-8 text-center text-sm text-foreground/70">
          {t("youBlocked")}
        </div>
      )}

      {conversation.areFriends && !conversation.isBlockedByMe && conversation.isBlockedByThem && (
        <div className="glass-surface rounded-3xl p-8 text-center text-sm text-foreground/70">
          {t("conversationUnavailable")}
        </div>
      )}

      {canChat && (
        <>
          <div className="flex gap-2">
            <button type="button" onClick={() => setView("chat")} className={tabClass(view === "chat")}>
              💬 {t("chatTab")}
            </button>
            <button type="button" onClick={() => setView("call")} className={tabClass(view === "call")}>
              📹 {t("callTab")}
            </button>
          </div>

          {view === "call" ? (
            <MiroTalkCall roomSlug={conversation.roomSlug} displayName={currentUserName} />
          ) : (
            <div className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
              <div className="flex max-h-[55vh] min-h-[35vh] flex-col gap-3 overflow-y-auto">
                {conversation.messages.length === 0 ? (
                  <p className="m-auto text-sm text-foreground/50">{t("noMessagesYet")}</p>
                ) : (
                  conversation.messages.map((message) => {
                    const isMine = message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}
                        >
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
                            {formatDateTime(locale, message.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <form
                ref={formRef}
                action={action}
                className="flex gap-2 border-t border-black/5 pt-3 dark:border-white/10"
              >
                <input type="hidden" name="recipientId" value={conversation.friend.userId} />
                <input
                  name="content"
                  placeholder={t("placeholder")}
                  required
                  className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {t("send")}
                </button>
              </form>
              {state?.message && (
                <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
