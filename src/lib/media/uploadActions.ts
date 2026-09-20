"use server";

import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";

// Photos, voice notes and announcement images go straight from the browser to
// Supabase Storage with a one-time signed URL: a Server Action would cap the
// upload at 4.5 MB and tie up a function for the whole transfer.

const CHAT_BUCKET = "chat-media";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

export type UploadTicket = { path: string; token: string } | { error: string };

export async function createMediaUpload(
  kind: "image" | "audio",
  fileName: string,
  contentType: string,
  size: number,
): Promise<UploadTicket> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Connecte-toi d'abord." };

  const expected = kind === "image" ? "image/" : "audio/";
  if (!contentType.startsWith(expected)) {
    return { error: kind === "image" ? "Choisis une image." : "Fichier audio attendu." };
  }
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (size > limit) {
    return { error: `Fichier trop lourd (${Math.round(size / 1024 / 1024)} Mo, maximum ${limit / 1024 / 1024} Mo).` };
  }

  const db = createAdminClient();
  if (!db) return { error: "Supabase (clé service_role) n'est pas configuré." };

  const safe = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(-40) || (kind === "image" ? "photo.jpg" : "audio.webm");
  const path = `${profile.id}/${Date.now()}-${randomBytes(4).toString("hex")}-${safe}`;
  const { data, error } = await db.storage.from(CHAT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return {
      error: error?.message.includes("not found")
        ? "Le dossier de stockage « chat-media » n'existe pas : exécute supabase/schema.sql."
        : (error?.message ?? "Envoi impossible."),
    };
  }
  return { path: data.path, token: data.token };
}
