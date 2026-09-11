import "server-only";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * Wraps message content in the school's branded shell.
 *
 * The logo is drawn with a table + background colour rather than an <img>
 * on purpose: Gmail, Outlook and most mobile clients block remote images by
 * default until the reader clicks "display images", so a logo image would
 * be an empty box on first open — which is exactly when the email needs to
 * look legitimate. This renders identically everywhere with no downloads.
 *
 * Note on the sender avatar: the round picture Gmail shows next to the
 * sender is NOT controlled by the email itself. It comes from BIMI (which
 * needs a domain you own, DMARC enforcement and usually a paid VMC
 * certificate) or from a Google Workspace profile photo. It cannot be set
 * while sending from a rewritten @brevosend.com address — see
 * .env.example for the contact@cpkef.tn migration.
 */
export function renderEmail({
  title,
  bodyHtml,
  footerNote,
}: {
  title: string;
  bodyHtml: string;
  footerNote?: string;
}) {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#12131a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e8f5;">
            <tr>
              <td style="background:#4f46e5;padding:24px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:56px;height:56px;background:#ffffff;border-radius:16px;color:#4f46e5;font-size:20px;font-weight:bold;text-align:center;line-height:56px;">CPK</td>
                  </tr>
                </table>
                <p style="margin:12px 0 0;color:#ffffff;font-size:15px;font-weight:bold;">CPK Learn</p>
                <p style="margin:2px 0 0;color:#c7d2fe;font-size:12px;">Collège Pilote du Kef</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <h1 style="margin:0 0 16px;font-size:19px;color:#12131a;">${escapeHtml(title)}</h1>
                <div style="font-size:15px;line-height:1.6;color:#3f4156;">${bodyHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px;border-top:1px solid #eef0f7;">
                <p style="margin:0;font-size:12px;color:#8a8dbe;">
                  ${footerNote ? `${escapeHtml(footerNote)}<br /><br />` : ""}
                  Collège Pilote du Kef — 99766801<br />
                  <a href="${SITE_URL}" style="color:#4f46e5;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "")}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Turns a plain-text message typed by an admin into safe HTML paragraphs. */
export function plainTextToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
