"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Avatar from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage, type SentMessage } from "@/lib/chat/actions";
import { mediaUrl, uploadMedia } from "@/lib/media/upload";
import { formatDateTime } from "@/lib/formatDate";

export type ChatMessage = SentMessage & {
  authorName?: string | null;
  authorAvatar?: string | null;
};

type Props = {
  scope: "dm" | "group";
  targetId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  locale: string;
  /** Group chats show who wrote what; a private conversation does not need to. */
  showAuthors?: boolean;
  placeholder?: string;
};

function rowToMessage(row: Record<string, unknown>, scope: "dm" | "group"): ChatMessage {
  return {
    id: String(row.id),
    authorId: String(scope === "dm" ? row.sender_id : row.author_id),
    content: (row.content as string | null) ?? null,
    mediaPath: (row.media_path as string | null) ?? null,
    mediaType: (row.media_type as "image" | "audio" | null) ?? null,
    mediaDuration: (row.media_duration as number | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export default function ChatWindow({
  scope,
  targetId,
  currentUserId,
  initialMessages,
  locale,
  showAuthors = false,
  placeholder = "Écris ton message…",
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"idle" | "sending" | "uploading">("idle");
  const [recordingSince, setRecordingSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const authors = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null }>();
    for (const message of initialMessages) {
      if (message.authorName) map.set(message.authorId, { name: message.authorName, avatar: message.authorAvatar ?? null });
    }
    return map;
  }, [initialMessages]);

  const add = useCallback((message: ChatMessage) => {
    setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
  }, []);

  // Live updates: Supabase pushes each new row over a websocket, so a message
  // appears on the other screen in a few milliseconds.
  useEffect(() => {
    const supabase = createClient();
    const table = scope === "dm" ? "direct_messages" : "group_messages";
    const filter = scope === "dm" ? undefined : `group_id=eq.${targetId}`;

    const channel = supabase
      .channel(`chat:${scope}:${targetId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        if (scope === "dm") {
          const sender = String(row.sender_id);
          const recipient = String(row.recipient_id);
          const mine = sender === currentUserId && recipient === targetId;
          const theirs = sender === targetId && recipient === currentUserId;
          if (!mine && !theirs) return;
        }
        add(rowToMessage(row, scope));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope, targetId, currentUserId, add]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (recordingSince === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [recordingSince]);

  async function send(payload: { content?: string; mediaPath?: string; mediaType?: "image" | "audio"; mediaDuration?: number }) {
    setError(null);
    setBusy("sending");
    const result = await sendChatMessage({ scope, targetId, ...payload });
    setBusy("idle");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    add(result.message);
  }

  async function onPhoto(file: File) {
    setError(null);
    setBusy("uploading");
    const uploaded = await uploadMedia("image", file);
    setBusy("idle");
    if ("error" in uploaded) {
      setError(uploaded.error);
      return;
    }
    await send({ mediaPath: uploaded.path, mediaType: "image" });
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (event) => chunks.current.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const seconds = Math.round((Date.now() - (recordingSince ?? Date.now())) / 1000);
        const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
        setRecordingSince(null);
        if (blob.size < 1200) return; // a tap, not a message
        setBusy("uploading");
        const uploaded = await uploadMedia("audio", blob, "vocal.webm");
        setBusy("idle");
        if ("error" in uploaded) {
          setError(uploaded.error);
          return;
        }
        await send({ mediaPath: uploaded.path, mediaType: "audio", mediaDuration: seconds });
      };
      recorder.current = media;
      setRecordingSince(Date.now());
      media.start();
    } catch {
      setError("Micro indisponible : autorise l'accès au micro dans ton navigateur.");
    }
  }

  function stopRecording() {
    recorder.current?.stop();
    recorder.current = null;
  }

  const recordingSeconds = recordingSince ? Math.floor((now - recordingSince) / 1000) : 0;

  return (
    <div className="glass-surface flex flex-col gap-3 rounded-3xl p-5">
      <div className="flex max-h-[55vh] min-h-[35vh] flex-col gap-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-foreground/50">Aucun message pour l&apos;instant.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.authorId === currentUserId;
            const author = authors.get(message.authorId);
            return (
              <div key={message.id} className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                {showAuthors && !isMine && <Avatar name={author?.name ?? "?"} photoUrl={author?.avatar ?? null} size={28} />}
                <div className={`flex max-w-[78%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                  {showAuthors && !isMine && (
                    <span className="mb-0.5 text-[11px] font-medium text-foreground/60">{author?.name ?? "Membre"}</span>
                  )}
                  <div
                    className={`overflow-hidden rounded-2xl text-sm ${
                      message.mediaType === "image"
                        ? ""
                        : isMine
                          ? "bg-brand-600 px-4 py-2 text-white"
                          : "bg-black/5 px-4 py-2 text-foreground dark:bg-white/10"
                    }`}
                  >
                    {message.mediaType === "image" && message.mediaPath && (
                      <a href={mediaUrl(message.mediaPath)} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={mediaUrl(message.mediaPath)}
                          alt="Photo"
                          width={420}
                          height={420}
                          unoptimized
                          className="max-h-72 w-auto rounded-2xl object-cover"
                        />
                      </a>
                    )}
                    {message.mediaType === "audio" && message.mediaPath && (
                      <audio
                        controls
                        preload="none"
                        src={mediaUrl(message.mediaPath)}
                        className="h-10 w-56 max-w-full"
                      />
                    )}
                    {message.content && (
                      <p className={message.mediaType === "image" ? "px-1 pt-1 text-foreground" : ""}>{message.content}</p>
                    )}
                  </div>
                  <span className="mt-0.5 text-[11px] text-foreground/40">
                    {message.mediaType === "audio" && message.mediaDuration ? `${message.mediaDuration}s · ` : ""}
                    {formatDateTime(locale, message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10">
        <label
          className="cursor-pointer rounded-full bg-black/5 px-3 py-2 text-base transition hover:bg-black/10 dark:bg-white/10"
          title="Envoyer une photo"
        >
          📷
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy !== "idle"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onPhoto(file);
            }}
          />
        </label>

        <button
          type="button"
          title="Maintiens pour enregistrer un vocal"
          disabled={busy === "uploading"}
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={() => recordingSince !== null && stopRecording()}
          className={`rounded-full px-3 py-2 text-base transition ${
            recordingSince !== null
              ? "animate-pulse bg-red-600 text-white"
              : "bg-black/5 hover:bg-black/10 dark:bg-white/10"
          }`}
        >
          {recordingSince !== null ? `⏺ ${recordingSeconds}s` : "🎤"}
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && text.trim()) {
              e.preventDefault();
              const content = text;
              setText("");
              send({ content });
            }
          }}
          placeholder={recordingSince !== null ? "Enregistrement…" : placeholder}
          className="flex-1 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/10 dark:bg-white/5"
        />

        <button
          type="button"
          disabled={busy !== "idle" || !text.trim()}
          onClick={() => {
            const content = text;
            setText("");
            send({ content });
          }}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {busy === "sending" ? "…" : "Envoyer"}
        </button>
      </div>

      {busy === "uploading" && <p className="text-xs text-foreground/60">Envoi du fichier…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
