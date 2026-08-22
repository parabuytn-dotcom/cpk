"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/messaging/actions";
import { formatDateTime } from "@/lib/formatDate";
import type { MessageRow } from "@/lib/messaging/data";

export default function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
  participantNames,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  participantNames: Record<string, string>;
}) {
  const t = useTranslations("messaging");
  const locale = useLocale();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            author_id: string | null;
            content: string;
            created_at: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                authorId: row.author_id,
                authorName:
                  row.author_id === currentUserId
                    ? t("me")
                    : (row.author_id && participantNames[row.author_id]) || "?",
                content: row.content,
                createdAt: row.created_at,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, participantNames, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("conversationId", conversationId);
      formData.set("content", content);
      await sendMessage(undefined, formData);
    });
  }

  return (
    <div className="glass-surface flex h-[28rem] flex-col overflow-hidden rounded-3xl">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-foreground/50">{t("noMessagesYet")}</p>
        )}
        {messages.map((m) => {
          const mine = m.authorId === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="mb-0.5 px-1 text-xs text-foreground/50">{m.authorName}</span>}
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-brand-600 text-white" : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {m.content}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-foreground/30">
                {formatDateTime(locale, m.createdAt)}
              </span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/10">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {t("send")}
        </button>
      </form>
    </div>
  );
}
