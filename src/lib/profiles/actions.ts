"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { notify } from "@/lib/notifications/engine";

export async function toggleFollow(userId: string, follow: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");
  if (profile.id === userId) throw new Error("Impossible de se suivre soi-même.");

  const supabase = await createClient();

  if (follow) {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: profile.id, followed_id: userId });
    if (error) throw new Error(error.message);
    await notify(userId, "follow", "Quelqu'un a commencé à te suivre.", `/profil/${profile.id}`);
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", profile.id)
      .eq("followed_id", userId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/profil/${userId}`);
}
