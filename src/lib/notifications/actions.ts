"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export async function markNotificationRead(notificationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", profile.id);

  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", profile.id)
    .eq("read", false);

  revalidatePath("/", "layout");
}
