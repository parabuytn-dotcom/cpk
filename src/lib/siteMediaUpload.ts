"use client";

import { createClient } from "@/lib/supabase/client";
import { createSiteMediaUpload } from "@/lib/admin/siteMediaActions";

const SITE_MEDIA_BUCKET = "site-media";

/** Uploads a file from the browser straight to Storage; returns its path in the bucket. */
export async function uploadSiteMedia(
  kind: "intro_video" | "melik" | "edem",
  file: File,
): Promise<{ path: string } | { error: string }> {
  const ticket = await createSiteMediaUpload(kind, file.name, file.type, file.size);
  if ("error" in ticket) return ticket;

  const { error } = await createClient()
    .storage.from(SITE_MEDIA_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
  if (error) return { error: `Échec de l'envoi : ${error.message}` };
  return { path: ticket.path };
}
