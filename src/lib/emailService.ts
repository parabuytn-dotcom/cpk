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
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<SendEmailResult> {
  const transport = getTransport();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transport || !fromAddress) {
    return { success: false, error: "SMTP_HOST/PORT/USER/PASSWORD not configured." };
  }

  try {
    await transport.sendMail({
      from: `CPK Learn <${fromAddress}>`,
      to,
      subject,
      html: htmlContent,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}
