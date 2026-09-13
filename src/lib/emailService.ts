import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendEmailResult = { success: true } | { success: false; error: string };

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !password) return null;

  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass: password },
    });
  }

  return cachedTransport;
}

/**
 * Inline images are attached to the message rather than linked, and referenced
 * from the HTML as `<img src="cid:THE_CID">`. A remote <img> is blocked by
 * default in most mail clients; an embedded one is not.
 */
export type EmailAttachment = { filename: string; content: Buffer; cid: string };

export type SendEmailOptions = {
  attachments?: EmailAttachment[];
  sentBy?: string | null;
  /**
   * Plain-text copy kept in email_logs. Left empty unless the caller passes it:
   * the HTML itself is never stored, since it can carry a password or a code.
   */
  logBody?: string;
};

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  options: SendEmailOptions = {},
): Promise<SendEmailResult> {
  const result = await deliver(to, subject, htmlContent, options.attachments);
  await logEmailAttempt(to, subject, options, result);
  return result;
}

async function deliver(
  to: string,
  subject: string,
  htmlContent: string,
  attachments?: EmailAttachment[],
): Promise<SendEmailResult> {
  const transport = getTransport();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transport || !fromAddress) {
    return { success: false, error: "SMTP_HOST/PORT/USER/PASSWORD not configured." };
  }

  try {
    await transport.sendMail({
      // The display name is the one part of the sender we fully control:
      // Brevo rewrites the domain of an unauthenticated sender (a gmail.com
      // address can never be authenticated), so recipients see this name
      // rather than the @brevosend.com address it actually came from.
      from: `CPK Learn — Collège Pilote du Kef <${fromAddress}>`,
      replyTo: process.env.SMTP_REPLY_TO || fromAddress,
      to,
      subject,
      html: htmlContent,
      attachments,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

// Every send lands in email_logs, whatever triggered it, so Admin > Emails and
// the daily Brevo quota count all of them — not just the ones sent from the
// admin composer. Service-role client: some senders (password reset) have no
// session, and email_logs has no insert policy.
async function logEmailAttempt(
  to: string,
  subject: string,
  options: SendEmailOptions,
  result: SendEmailResult,
) {
  const adminClient = createAdminClient();
  if (!adminClient) return;
  await adminClient.from("email_logs").insert({
    sent_by: options.sentBy ?? null,
    recipient: to,
    subject,
    body: options.logBody ?? "",
    status: result.success ? "sent" : "failed",
    error: result.success ? null : result.error,
  });
}
