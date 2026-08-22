"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { checkJournalisteCpk } from "@/lib/badges/engine";
import { notify } from "@/lib/notifications/engine";
import { createPostSchema, createCommentSchema, type FormState } from "./schemas";

export async function createPost(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = createPostSchema.safeParse({ content: formData.get("content") });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const media = formData.get("media");

  let mediaType: "image" | "video" | null = null;
  let mediaPath: string | null = null;

  if (media instanceof File && media.size > 0) {
    mediaType = media.type.startsWith("video/") ? "video" : "image";

    const requiredTag = mediaType === "video" ? "reels_publisher" : "feed_publisher";
    if (profile.role !== "admin" && !profile.tags.includes(requiredTag)) {
      return {
        message:
          mediaType === "video"
            ? "Tu n'as pas la permission de publier des vidéos (reels)."
            : "Tu n'as pas la permission de publier des images.",
      };
    }

    const ext = media.name.split(".").pop() ?? "bin";
    const path = `${profile.id}/${randomBytes(6).toString("hex")}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("feed-media")
      .upload(path, media, { contentType: media.type });
    if (uploadError) return { message: uploadError.message };
    mediaPath = path;
  } else if (profile.role !== "admin" && !profile.tags.includes("feed_publisher")) {
    return { message: "Tu n'as pas la permission de publier sur le feed." };
  }

  const { error } = await supabase.from("feed_posts").insert({
    author_id: profile.id,
    content: validated.data.content,
    media_type: mediaType,
    media_path: mediaPath,
  });

  if (error) return { message: error.message };

  await checkJournalisteCpk(profile.id);

  revalidatePath("/feed");
  return { success: "Publié." };
}

export async function toggleLike(postId: string, liked: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const supabase = await createClient();

  if (liked) {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: profile.id });

    const { data: post } = await supabase
      .from("feed_posts")
      .select("author_id")
      .eq("id", postId)
      .single();
    if (post?.author_id && post.author_id !== profile.id) {
      await notify(post.author_id, "like", "Quelqu'un a aimé votre publication.", "/feed");
    }
  } else {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", profile.id);
  }

  revalidatePath("/feed");
}

export async function addComment(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = createCommentSchema.safeParse({
    postId: formData.get("postId"),
    content: formData.get("content"),
  });
  if (!validated.success) return { message: "Commentaire invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("post_comments").insert({
    post_id: validated.data.postId,
    author_id: profile.id,
    content: validated.data.content,
  });

  if (error) return { message: error.message };

  const { data: post } = await supabase
    .from("feed_posts")
    .select("author_id")
    .eq("id", validated.data.postId)
    .single();
  if (post?.author_id && post.author_id !== profile.id) {
    await notify(post.author_id, "comment", "Quelqu'un a commenté votre publication.", "/feed");
  }

  revalidatePath("/feed");
  return { success: "" };
}
