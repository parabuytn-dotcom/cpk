"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { getSiteSetting } from "@/lib/admin/data";
import {
  ABOUT_PEOPLE,
  INTRO_VIDEO_SOURCE_KEY,
  INTRO_VIDEO_VALUE_KEY,
  SITE_MEDIA_BUCKET,
  parseYoutubeId,
  type AboutPerson,
} from "@/lib/siteMedia";

type FormState = { message?: string; success?: string } | undefined;

// Supabase's free plan refuses any single file above 50 MB.
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type UploadKind = "intro_video" | AboutPerson;

function isUploadKind(value: string): value is UploadKind {
  return value === "intro_video" || Object.hasOwn(ABOUT_PEOPLE, value);
}

/**
 * A video is far too big to pass through a Server Action (Vercel caps request
 * bodies at 4.5 MB), so the browser uploads straight to Supabase Storage with
 * a one-time signed URL handed out here, then calls a save action with the path.
 */
export async function createSiteMediaUpload(
  kind: string,
  fileName: string,
  contentType: string,
  size: number,
): Promise<{ path: string; token: string } | { error: string }> {
  await requireAdmin();
  if (!isUploadKind(kind)) return { error: "Type d'envoi inconnu." };

  const isVideo = kind === "intro_video";
  if (isVideo ? !contentType.startsWith("video/") : !contentType.startsWith("image/")) {
    return { error: isVideo ? "Choisis un fichier vidéo (MP4 de préférence)." : "Choisis une image (JPG ou PNG)." };
  }
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (size > limit) {
    return {
      error: `Fichier trop lourd (${Math.round(size / 1024 / 1024)} Mo, maximum ${limit / 1024 / 1024} Mo).${
        isVideo ? " Compresse la vidéo, ou mets-la sur YouTube et colle le lien." : ""
      }`,
    };
  }

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Supabase (clé service_role) n'est pas configuré." };

  const safeName = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(-60) || "fichier";
  const path = `${kind}/${randomBytes(6).toString("hex")}-${safeName}`;
  const { data, error } = await adminClient.storage.from(SITE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return {
      error: error?.message.includes("not found")
        ? "Le dossier de stockage « site-media » n'existe pas encore : exécute supabase/schema.sql."
        : (error?.message ?? "Envoi impossible."),
    };
  }
  return { path: data.path, token: data.token };
}

async function writeSettings(values: Record<string, string>) {
  const adminClient = createAdminClient();
  if (!adminClient) return "Supabase (clé service_role) n'est pas configuré.";
  const { error } = await adminClient
    .from("site_settings")
    .upsert(Object.entries(values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() })));
  return error?.message ?? null;
}

/** Deletes a file this feature uploaded earlier, once nothing points to it any more. */
async function removeOldUpload(previousPath: string | null, keptPath: string | null, prefix: string) {
  if (!previousPath || previousPath === keptPath || !previousPath.startsWith(`${prefix}/`)) return;
  await createAdminClient()?.storage.from(SITE_MEDIA_BUCKET).remove([previousPath]);
}

function revalidateIntro() {
  revalidatePath("/admin/parametres");
  revalidatePath("/[locale]/introducing", "page");
  revalidatePath("/[locale]/bienvenue", "page");
}

export async function saveIntroVideo(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const source = formData.get("source");
  const [previousSource, previousValue] = await Promise.all([
    getSiteSetting(INTRO_VIDEO_SOURCE_KEY),
    getSiteSetting(INTRO_VIDEO_VALUE_KEY),
  ]);
  const previousUpload = previousSource === "upload" ? previousValue : null;

  let value = "";
  if (source === "youtube") {
    const id = parseYoutubeId(String(formData.get("youtubeUrl") ?? ""));
    if (!id) return { message: "Lien YouTube non reconnu. Colle l'adresse de la vidéo (youtube.com/watch?v=… ou youtu.be/…)." };
    value = id;
  } else if (source === "upload") {
    const path = String(formData.get("uploadPath") ?? "");
    if (!path.startsWith("intro_video/") || path.includes("..")) return { message: "Envoie d'abord la vidéo." };
    value = path;
  } else if (source !== "none") {
    return { message: "Choix invalide." };
  }

  const error = await writeSettings({ [INTRO_VIDEO_SOURCE_KEY]: String(source), [INTRO_VIDEO_VALUE_KEY]: value });
  if (error) return { message: error };

  await removeOldUpload(previousUpload, source === "upload" ? value : null, "intro_video");
  revalidateIntro();
  return {
    success:
      source === "none"
        ? "Vidéo retirée de la page de présentation."
        : "Vidéo enregistrée : elle est en ligne sur la page de présentation.",
  };
}

export async function saveAboutPhoto(person: string, path: string | null): Promise<{ error?: string }> {
  await requireAdmin();
  if (!Object.hasOwn(ABOUT_PEOPLE, person)) return { error: "Personne inconnue." };
  const key = ABOUT_PEOPLE[person as AboutPerson].settingKey;
  if (path !== null && (!path.startsWith(`${person}/`) || path.includes(".."))) return { error: "Envoie d'abord la photo." };

  const previous = await getSiteSetting(key);
  const error = await writeSettings({ [key]: path ?? "" });
  if (error) return { error };

  await removeOldUpload(previous, path, person);
  revalidatePath("/admin/parametres");
  revalidatePath("/[locale]/a-propos", "page");
  revalidatePath("/[locale]/introducing", "page");
  return {};
}
