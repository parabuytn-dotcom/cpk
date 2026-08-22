import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type NotificationRow = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export async function listNotifications(userId: string, limit = 20): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, message, link, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    link: row.link,
    read: row.read,
    createdAt: row.created_at,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  return count ?? 0;
}
