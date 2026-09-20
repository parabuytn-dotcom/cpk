"use client";

import { createClient } from "@/lib/supabase/client";
import { createMediaUpload } from "./uploadActions";

const BUCKET = "chat-media";

export function mediaUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Uploads a photo or a voice note and returns its path in the bucket. */
export async function uploadMedia(kind: "image" | "audio", file: File | Blob, fileName?: string) {
  const name = fileName ?? (file instanceof File ? file.name : kind === "image" ? "photo.jpg" : "vocal.webm");
  const ticket = await createMediaUpload(kind, name, file.type, file.size);
  if ("error" in ticket) return ticket;

  const { error } = await createClient()
    .storage.from(BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
  if (error) return { error: `Échec de l'envoi : ${error.message}` };
  return { path: ticket.path };
}
