import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/send";

/**
 * Creates an in-site notification for `userId`. Always uses the service-role
 * client: the triggering action is usually performed by a *different* user
 * (e.g. someone commenting on your post), so it can't rely on the caller's
 * own RLS session to write into another user's notifications.
 *
 * Also mirrors it as a push notification (web + Android) to every device
 * the user has registered — best-effort, never blocks or throws.
 */
export type NotifyOptions = {
  /** Also show it as a blocking modal on the person's next page load. */
  intrusive?: boolean;
  /** Heading for that modal (ignored when not intrusive). */
  title?: string;
  /** Admin who wrote it, for hand-sent messages. */
  sentBy?: string;
};

export async function notify(
  userId: string,
  type: string,
  message: string,
  link?: string,
  options: NotifyOptions = {},
) {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  await adminClient.from("notifications").insert({
    user_id: userId,
    type,
    message,
    link: link ?? null,
    intrusive: options.intrusive ?? false,
    title: options.title ?? null,
    sent_by: options.sentBy ?? null,
  });

  await sendPushToUser(userId, {
    title: options.title || "CPK Learn",
    body: message,
    link,
  });
}

export async function notifyMany(
  userIds: string[],
  type: string,
  message: string,
  link?: string,
  options: NotifyOptions = {},
) {
  await Promise.all(userIds.map((id) => notify(id, type, message, link, options)));
}
