import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/engine";

export type IncomingMessage = {
  channel: "sms" | "email";
  externalId: string;
  sender: string;
  senderName?: string | null;
  subject?: string | null;
  body: string;
  receivedAt?: string | null;
};

/** "+21652254129" → "52254129", the form every profile's phone is stored in. Foreign numbers keep their "+". */
export function normalizeSmsSender(raw: string) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("216")) return digits.slice(3);
  if (digits.length === 8 && !trimmed.startsWith("+")) return digits;
  return trimmed.startsWith("+") ? `+${digits}` : trimmed;
}

/**
 * Records an incoming SMS or email and tells the admins. Idempotent: webhook
 * senders retry after a timeout, so the same message can arrive more than once
 * — the (channel, external_id) unique key turns a repeat into a no-op, and the
 * admins are only notified the first time.
 */
export async function storeIncomingMessage(message: IncomingMessage): Promise<"stored" | "duplicate" | "error"> {
  const adminClient = createAdminClient();
  if (!adminClient) return "error";

  let profileId: string | null = null;
  if (message.channel === "sms" && /^\d{8}$/.test(message.sender)) {
    const { data } = await adminClient.from("profiles").select("id").eq("phone", message.sender).maybeSingle();
    profileId = data?.id ?? null;
  } else if (message.channel === "email") {
    const { data } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("contact_email", message.sender)
      .limit(1)
      .maybeSingle();
    profileId = data?.id ?? null;
  }

  const receivedAt = message.receivedAt && !Number.isNaN(Date.parse(message.receivedAt))
    ? new Date(message.receivedAt).toISOString()
    : new Date().toISOString();

  const { data: inserted, error } = await adminClient
    .from("inbox_messages")
    .upsert(
      {
        channel: message.channel,
        external_id: message.externalId,
        sender: message.sender,
        sender_name: message.senderName ?? null,
        subject: message.subject ?? null,
        body: message.body,
        profile_id: profileId,
        received_at: receivedAt,
      },
      { onConflict: "channel,external_id", ignoreDuplicates: true },
    )
    .select("id");

  if (error) return "error";
  if (!inserted || inserted.length === 0) return "duplicate";

  const from = message.senderName || message.sender;
  const label = message.channel === "sms" ? `Nouveau SMS de ${from}` : `Nouvel email de ${from}`;
  const { data: admins } = await adminClient.from("profiles").select("id").in("role", ["admin", "director"]);
  await Promise.all(
    (admins ?? []).map((admin) => notify(admin.id, "inbox_message", label, "/admin/boite-de-reception")),
  );

  return "stored";
}
