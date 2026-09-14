import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSiteSetting } from "@/lib/admin/data";

// Files the admin uploads from Réglages (intro video, "Plus de nous" photos)
// live in the public `site-media` bucket; site_settings only stores their
// path inside it, so a replaced file can be deleted by path.
export const SITE_MEDIA_BUCKET = "site-media";

export const INTRO_VIDEO_SOURCE_KEY = "intro_video_source";
export const INTRO_VIDEO_VALUE_KEY = "intro_video_value";

export const ABOUT_PEOPLE = {
  melik: { name: "Melik Messaoudi", settingKey: "about_photo_melik", fallback: "/melik-messaoudi.jpg" },
  edem: { name: "Edem Aifia", settingKey: "about_photo_edem", fallback: "/edem-aifia.jpg" },
} as const;

export type AboutPerson = keyof typeof ABOUT_PEOPLE;

export type IntroVideo = { kind: "upload"; url: string } | { kind: "youtube"; id: string } | null;

/** Accepts every YouTube link shape people paste: watch?v=, youtu.be/, shorts/, embed/, live/. */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ??
      null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export async function publicSiteMediaUrl(path: string) {
  const supabase = await createClient();
  return supabase.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function getIntroVideo(): Promise<IntroVideo> {
  const [source, value] = await Promise.all([
    getSiteSetting(INTRO_VIDEO_SOURCE_KEY),
    getSiteSetting(INTRO_VIDEO_VALUE_KEY),
  ]);
  if (!value) return null;
  if (source === "youtube") return { kind: "youtube", id: value };
  if (source === "upload") return { kind: "upload", url: await publicSiteMediaUrl(value) };
  return null;
}

/** Photo URL per person: the uploaded one when there is one, else the file shipped in /public. */
export async function getAboutPhotos(): Promise<Record<AboutPerson, string>> {
  const entries = await Promise.all(
    (Object.keys(ABOUT_PEOPLE) as AboutPerson[]).map(async (person) => {
      const path = await getSiteSetting(ABOUT_PEOPLE[person].settingKey);
      return [person, path ? await publicSiteMediaUrl(path) : ABOUT_PEOPLE[person].fallback] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<AboutPerson, string>;
}
