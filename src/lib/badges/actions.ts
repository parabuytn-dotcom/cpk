"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { createClient } from "@/lib/supabase/server";

export async function setUserBadge(userId: string, badgeId: string, awarded: boolean) {
  await requireAdmin();
  const supabase = await createClient();

  if (awarded) {
    await supabase.from("user_badges").insert({ user_id: userId, badge_id: badgeId });
  } else {
    await supabase.from("user_badges").delete().eq("user_id", userId).eq("badge_id", badgeId);
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/dashboard");
}
