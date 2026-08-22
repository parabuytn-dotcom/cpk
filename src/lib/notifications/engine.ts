import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Creates an in-site notification for `userId`. Always uses the service-role
 * client: the triggering action is usually performed by a *different* user
 * (e.g. someone commenting on your post), so it can't rely on the caller's
 * own RLS session to write into another user's notifications.
 *
 * TODO: Intégrer API Push Mobile — miroir de cette notification en push
 * pour l'app mobile une fois disponible.
 */
export async function notify(userId: string, type: string, message: string, link?: string) {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  await adminClient.from("notifications").insert({
    user_id: userId,
    type,
    message,
    link: link ?? null,
  });
}

export async function notifyMany(userIds: string[], type: string, message: string, link?: string) {
  await Promise.all(userIds.map((id) => notify(id, type, message, link)));
}
