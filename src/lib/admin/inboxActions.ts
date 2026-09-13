"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getCurrentProfile } from "@/lib/auth/session";
import { sendSms, gatewayRequest } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { renderEmail, plainTextToHtml } from "@/lib/emailTemplate";
import { notify } from "@/lib/notifications/engine";
import { SITE_URL } from "@/lib/siteUrl";

const INBOX_PATH = "/admin/boite-de-reception";
const SMS_WEBHOOK_URL = `${SITE_URL}/api/sms/received`;

type ActionResult = { success: true; message?: string } | { success: false; error: string };

export async function setInboxMessageRead(id: string, read: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(INBOX_PATH, "layout");
  return { success: true };
}

/** Answers over the channel the message came in on: an SMS gets an SMS, an email an email. */
export async function replyToInboxMessage(id: string, text: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = await getCurrentProfile();
  const reply = text.trim();
  if (!reply) return { success: false, error: "La réponse est vide." };

  const supabase = await createClient();
  const { data: message } = await supabase
    .from("inbox_messages")
    .select("id, channel, sender, subject")
    .eq("id", id)
    .maybeSingle();
  if (!message) return { success: false, error: "Message introuvable." };

  const result =
    message.channel === "sms"
      ? await sendSms(message.sender, reply, "manual")
      : await sendEmail(
          message.sender,
          message.subject?.toLowerCase().startsWith("re:") ? message.subject : `Re: ${message.subject ?? ""}`.trim(),
          renderEmail({ title: message.subject ?? "Réponse", bodyHtml: plainTextToHtml(reply) }),
          { sentBy: admin?.id ?? null, logBody: reply },
        );
  if (!result.success) return { success: false, error: result.error };

  const now = new Date().toISOString();
  await supabase
    .from("inbox_messages")
    .update({ reply_body: reply, replied_at: now, read_at: now })
    .eq("id", id);

  revalidatePath(INBOX_PATH, "layout");
  return { success: true, message: message.channel === "sms" ? "Réponse envoyée par SMS." : "Réponse envoyée par email." };
}

/** Help requests come from signed-in accounts, so the answer goes to them as a notification. */
export async function replyToHelpRequest(id: string, text: string): Promise<ActionResult> {
  await requireAdmin();
  const reply = text.trim();
  if (!reply) return { success: false, error: "La réponse est vide." };

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("help_requests")
    .select("id, author_id, subject, status")
    .eq("id", id)
    .maybeSingle();
  if (!request) return { success: false, error: "Demande introuvable." };
  if (!request.author_id) return { success: false, error: "L'auteur de cette demande n'a plus de compte." };

  await notify(request.author_id, "help_reply", `Réponse à ta demande « ${request.subject} » : ${reply}`, "/aide");

  const { error } = await supabase
    .from("help_requests")
    .update({
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      status: request.status === "open" ? "in_progress" : request.status,
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath(INBOX_PATH, "layout");
  return { success: true, message: "Réponse envoyée en notification." };
}

export async function setHelpRequestStatus(id: string, status: string): Promise<ActionResult> {
  await requireAdmin();
  if (!["open", "in_progress", "closed"].includes(status)) return { success: false, error: "Statut invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("help_requests").update({ status }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(INBOX_PATH, "layout");
  return { success: true };
}

type GatewayWebhook = { id: string; url: string; event: string };

export type SmsInboxStatus =
  | { state: "active" }
  | { state: "inactive" }
  | { state: "missing_key" }
  | { state: "error"; error: string };

async function listSmsReceivedWebhooks(): Promise<GatewayWebhook[]> {
  const response = await gatewayRequest("/webhooks");
  if (!response.ok) throw new Error(`La passerelle a répondu ${response.status} : ${await response.text()}`);
  const hooks = (await response.json()) as GatewayWebhook[];
  return hooks.filter((hook) => hook.event === "sms:received");
}

export async function getSmsInboxStatus(): Promise<SmsInboxStatus> {
  await requireAdmin();
  if (!process.env.SMS_WEBHOOK_SIGNING_KEY) return { state: "missing_key" };
  try {
    const hooks = await listSmsReceivedWebhooks();
    return hooks.some((hook) => hook.url === SMS_WEBHOOK_URL) ? { state: "active" } : { state: "inactive" };
  } catch (error) {
    return { state: "error", error: error instanceof Error ? error.message : "Passerelle injoignable." };
  }
}

/**
 * Points the phone's "SMS received" webhook at this site. Re-runnable: any
 * earlier registration of this same route — e.g. under the vercel.app address,
 * before the switch to cpkef.tn — is removed first, so texts are never
 * delivered twice or to a dead address.
 */
export async function enableSmsInbox(): Promise<ActionResult> {
  await requireAdmin();
  if (!process.env.SMS_WEBHOOK_SIGNING_KEY) {
    return {
      success: false,
      error: "Ajoute d'abord SMS_WEBHOOK_SIGNING_KEY dans Vercel (clé visible dans l'app : Settings > Webhooks > Signing Key), puis redéploie.",
    };
  }

  try {
    const hooks = await listSmsReceivedWebhooks();
    if (hooks.some((hook) => hook.url === SMS_WEBHOOK_URL)) {
      return { success: true, message: "La réception des SMS est déjà active." };
    }

    for (const hook of hooks.filter((h) => h.url.endsWith("/api/sms/received"))) {
      await gatewayRequest(`/webhooks/${hook.id}`, { method: "DELETE" });
    }

    const response = await gatewayRequest("/webhooks", {
      method: "POST",
      body: JSON.stringify({ url: SMS_WEBHOOK_URL, event: "sms:received" }),
    });
    if (!response.ok) {
      return { success: false, error: `La passerelle a répondu ${response.status} : ${await response.text()}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Passerelle injoignable." };
  }

  revalidatePath(INBOX_PATH);
  return { success: true, message: "Réception des SMS activée." };
}
