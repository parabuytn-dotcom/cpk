import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type BadgeRow = { id: string; code: string; label: string; emoji: string; description: string };

export async function listAllBadges(): Promise<BadgeRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase.from("badges").select("id, code, label, emoji, description");
  return data ?? [];
}

export type EarnedBadge = { code: string; label: string; emoji: string; description: string };

export async function listMyBadges(userId: string): Promise<EarnedBadge[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_badges")
    .select("badges(code, label, emoji, description)")
    .eq("user_id", userId);

  return (data ?? [])
    .map((row) => (Array.isArray(row.badges) ? row.badges[0] : row.badges))
    .filter((b): b is EarnedBadge => Boolean(b));
}
