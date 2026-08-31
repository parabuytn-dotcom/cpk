import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/siteUrl";

export type DocumentEntry = {
  fullName: string;
  cin: string;
  childFirstName: string;
  phone: string;
  password: string;
  qrUrl: string;
};

const PAGE_WIDTH = 595.28; // A4 at 72 DPI
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const GAP = 16;
const CARDS_PER_PAGE = 3;
const CARD_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const CARD_HEIGHT = (PAGE_HEIGHT - 2 * MARGIN - (CARDS_PER_PAGE - 1) * GAP) / CARDS_PER_PAGE;

export function qrLoginUrl(token: string) {
  return `${SITE_URL}/api/qr-login/${token}`;
}

/** Renders one printable "document" per entry, 3 per A4 page to save paper. */
export async function buildDocumentsPdf(entries: DocumentEntry[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < entries.length; i += CARDS_PER_PAGE) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const pageEntries = entries.slice(i, i + CARDS_PER_PAGE);

    for (let j = 0; j < pageEntries.length; j++) {
      const entry = pageEntries[j];
      const cardTop = PAGE_HEIGHT - MARGIN - j * (CARD_HEIGHT + GAP);
      const cardBottom = cardTop - CARD_HEIGHT;

      page.drawRectangle({
        x: MARGIN,
        y: cardBottom,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderColor: rgb(0.65, 0.65, 0.65),
        borderWidth: 1,
      });

      const qrDataUrl = await QRCode.toDataURL(entry.qrUrl, { margin: 0, width: 400 });
      const qrPngBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrImage = await pdfDoc.embedPng(qrPngBytes);
      const qrSize = CARD_HEIGHT - 32;
      page.drawImage(qrImage, {
        x: MARGIN + CARD_WIDTH - qrSize - 20,
        y: cardBottom + (CARD_HEIGHT - qrSize) / 2,
        width: qrSize,
        height: qrSize,
      });

      const textX = MARGIN + 24;
      let textY = cardTop - 34;

      page.drawText("CPK Learn — Collège Pilote du Kef", {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
      textY -= 26;

      page.drawText(entry.fullName, { x: textX, y: textY, size: 16, font: fontBold });
      textY -= 20;

      page.drawText(`Parent de ${entry.childFirstName}`, {
        x: textX,
        y: textY,
        size: 11,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      textY -= 20;

      page.drawText(`CIN : ${entry.cin}`, { x: textX, y: textY, size: 12, font });
      textY -= 20;

      page.drawText(`Identifiant : ${entry.phone}`, { x: textX, y: textY, size: 12, font });
      textY -= 20;

      page.drawText(`Mot de passe : ${entry.password}`, { x: textX, y: textY, size: 12, font });
      textY -= 26;

      page.drawText("Scanne le QR code, ou connecte-toi sur cpk-platform.vercel.app", {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
      textY -= 12;
      page.drawText("avec l'identifiant et le mot de passe ci-dessus.", {
        x: textX,
        y: textY,
        size: 9,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
  }

  return pdfDoc.save();
}
