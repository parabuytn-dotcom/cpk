"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

type Message = { role: "user" | "model"; content: string };

export default function ChatWidget() {
  const t = useTranslations("assistant");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("error"));
      } else {
        setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      }
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <button
          aria-label={t("close")}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
        />
      )}
      {open && (
        <div className="relative z-50 mb-3 flex h-[28rem] w-80 max-w-[85vw] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10">
            <p className="text-sm font-semibold">{t("title")}</p>
            <button
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="text-foreground/50 hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-foreground/50">{t("welcome")}</p>
            )}
            <div className="flex flex-col gap-2">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "self-end bg-brand-600 text-white"
                      : "self-start bg-black/5 dark:bg-white/10"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {pending && (
                <div className="self-start rounded-2xl bg-black/5 px-3 py-2 text-sm text-foreground/50 dark:bg-white/10">
                  …
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="px-4 pb-1 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-black/5 p-3 dark:border-white/10">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("placeholder")}
              className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {t("send")}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white shadow-xl transition hover:scale-105"
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
