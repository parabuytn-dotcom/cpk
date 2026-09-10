import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";

export type NotificationRow = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  link: string | null;
  read: boolean;
  intrusive: boolean;
  createdAt: string;
};

/**
 * Unread notifications flagged `intrusive` — surfaced as a blocking modal by
 * the root layout rather than only under the bell. Kept deliberately small
 * (the newest few) since it runs on every page load.
 */
export async function listUnreadIntrusiveNotifications(
  userId: string,
): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, read, intrusive, created_at")
    .eq("user_id", userId)
    .eq("intrusive", true)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(3);

  return (data ?? []).map(toRow);
}

/** Full history for one user — admin-only view (/admin/notifications). */
export async function listNotificationsForUser(
  userId: string,
  limit = 100,
): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, read, intrusive, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(toRow);
}

type RawNotification = {
  id: string;
  type: string;
  title: string | null;
  message: string;
  link: string | null;
  read: boolean;
  intrusive: boolean;
  created_at: string;
};

function toRow(row: RawNotification): NotificationRow {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    read: row.read,
    intrusive: row.intrusive,
    createdAt: row.created_at,
  };
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, read, intrusive, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(toRow);
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
