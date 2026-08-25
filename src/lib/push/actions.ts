"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export async function registerPushToken(token: string, platform: "web" | "android") {
  const profile = await getCurrentProfile();
  if (!profile) return { success: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: profile.id, token, platform }, { onConflict: "token" });

  return { success: !error };
}
