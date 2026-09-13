import "server-only";
import nodemailer from "nodemailer";

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
 * Sends a transactional email via a generic SMTP relay (e.g. the mailbox
 * bundled with an OVH domain, or any other provider's SMTP credentials).
 * Used to deliver the generated password when a parent creates their
 * child's account. Degrades gracefully (logs, doesn't throw) when SMTP_*
 * isn't configured — the on-screen display of the password remains the
 * primary channel.
 */
/**
 * Inline images are attached to the message rather than linked, and referenced
 * from the HTML as `<img src="cid:THE_CID">`. A remote <img> is blocked by
 * default in most mail clients; an embedded one is not.
 */
export type EmailAttachment = { filename: string; content: Buffer; cid: string };

export async function sendEmail(
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
