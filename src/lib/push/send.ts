import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMessagingClient } from "./admin";

// Best-effort: called from notify()/notifyMany() on every in-site
// notification, but must never throw — a push failure (unconfigured
// Firebase, a stale/revoked token) should never break the caller's own
// action (liking a post, validating an account, etc.).
export async function sendPushToUser(
  userId: string,
  { title, body, link }: { title: string; body: string; link?: string },
) {
  try {
    const messaging = getMessagingClient();
    if (!messaging) return;

    const supabase = createAdminClient();
    if (!supabase) return;

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", userId);

    if (!tokens || tokens.length === 0) return;

    const staleIds: string[] = [];

    await Promise.all(
      tokens.map(async ({ id, token }) => {
        try {
          await messaging.send({
            token,
            notification: { title, body },
            data: link ? { link } : {},
          });
        } catch (error) {
          const code = (error as { errorInfo?: { code?: string } })?.errorInfo?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            staleIds.push(id);
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await supabase.from("push_tokens").delete().in("id", staleIds);
    }
  } catch {
    // Swallow — push is a nice-to-have layered on top of in-site notifications.
  }
}
