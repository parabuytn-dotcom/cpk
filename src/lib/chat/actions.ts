"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { notify } from "@/lib/notifications/engine";

// One entry point for both kinds of chat. The row is returned so the sender's
// screen can replace its optimistic bubble, and everyone else gets the same
// row pushed by Supabase Realtime within milliseconds — no polling.

const schema = z.object({
  scope: z.enum(["dm", "group"]),
  targetId: z.string().uuid(),
  content: z.string().trim().max(2000).optional().or(z.literal("")),
  mediaPath: z.string().max(300).optional().or(z.literal("")),
  mediaType: z.enum(["image", "audio"]).optional(),
  mediaDuration: z.number().int().min(0).max(600).optional(),
});

export type ChatInput = z.input<typeof schema>;
export type SentMessage = {
  id: string;
  authorId: string;
  content: string | null;
  mediaPath: string | null;
  mediaType: "image" | "audio" | null;
  mediaDuration: number | null;
  createdAt: string;
};
export type ChatResult = { ok: true; message: SentMessage } | { ok: false; error: string };

export async function sendChatMessage(input: ChatInput): Promise<ChatResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Connecte-toi d'abord." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Message invalide." };
  const { scope, targetId, content, mediaPath, mediaType, mediaDuration } = parsed.data;

  if (!content?.trim() && !mediaPath) return { ok: false, error: "Message vide." };

  const supabase = await createClient();
  const shared = {
    content: content?.trim() || null,
    media_path: mediaPath || null,
    media_type: mediaPath ? (mediaType ?? "image") : null,
    media_duration: mediaDuration ?? null,
  };

  if (scope === "dm") {
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: profile.id, recipient_id: targetId, ...shared })
      .select("id, sender_id, content, media_path, media_type, media_duration, created_at")
      .single();
    // RLS refuses a message to someone who isn't a friend, or who blocked you.
    if (error || !data) return { ok: false, error: error?.message ?? "Envoi impossible." };

    await notify(
      targetId,
      "direct_message",
      mediaPath && !content?.trim()
        ? `${profile.fullName ?? "Un ami"} t'a envoyé ${mediaType === "audio" ? "un vocal" : "une photo"}.`
        : `${profile.fullName ?? "Un ami"} : ${content?.slice(0, 80)}`,
      `/messages/${profile.id}`,
    );

    return {
      ok: true,
      message: {
        id: data.id,
        authorId: data.sender_id,
        content: data.content,
        mediaPath: data.media_path,
        mediaType: data.media_type,
        mediaDuration: data.media_duration,
        createdAt: data.created_at,
      },
    };
  }

  const { data, error } = await supabase
    .from("group_messages")
    .insert({ group_id: targetId, author_id: profile.id, ...shared })
    .select("id, author_id, content, media_path, media_type, media_duration, created_at")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Envoi impossible." };

  return {
    ok: true,
    message: {
      id: data.id,
      authorId: data.author_id,
      content: data.content,
      mediaPath: data.media_path,
      mediaType: data.media_type,
      mediaDuration: data.media_duration,
      createdAt: data.created_at,
    },
  };
}
