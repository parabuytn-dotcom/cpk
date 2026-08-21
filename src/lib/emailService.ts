import "server-only";

export type SendEmailResult = { success: true } | { success: false; error: string };

/**
 * Sends a transactional email via Brevo's REST API. Used to deliver the
 * generated password when a parent creates their child's account.
 * Degrades gracefully (logs, doesn't throw) when BREVO_API_KEY isn't set —
 * the on-screen display of the password remains the primary channel.
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    return { success: false, error: "BREVO_API_KEY / BREVO_SENDER_EMAIL not configured." };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: "CPK Learn" },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    return response.ok
      ? { success: true }
      : { success: false, error: `Brevo responded with ${response.status}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}
