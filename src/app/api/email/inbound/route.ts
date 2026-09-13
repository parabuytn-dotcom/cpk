import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { storeIncomingMessage } from "@/lib/inbox/store";

/**
 * POST /api/email/inbound?secret=… — Brevo's inbound parsing webhook
 * (event `inboundEmailProcessed`). Ready, but idle until cpkef.tn exists:
 * Brevo only receives mail for a domain it's delegated, and it has to be a
 * dedicated subdomain (e.g. reply.cpkef.tn) — pointing cpkef.tn's own MX
 * records at Brevo would take the real contact@cpkef.tn mailbox down. The
 * mailbox then forwards a copy of everything to contact@reply.cpkef.tn.
 *
 * Brevo doesn't sign these calls, so the webhook URL registered with Brevo
 * carries a secret (INBOUND_EMAIL_SECRET) that every call must present.
 */
type BrevoInboundItem = {
  MessageId?: string;
  Uuid?: string[];
  From?: { Address?: string; Name?: string | null };
  Subject?: string;
  SentAtDate?: string;
  RawTextBody?: string | null;
  ExtractedMarkdownMessage?: string;
};

function hasValidSecret(request: Request) {
  const expected = process.env.INBOUND_EMAIL_SECRET;
  const given = new URL(request.url).searchParams.get("secret");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.INBOUND_EMAIL_SECRET) {
    return NextResponse.json({ error: "INBOUND_EMAIL_SECRET is not configured" }, { status: 503 });
  }
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: { items?: BrevoInboundItem[] };
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let failed = 0;
  for (const item of data.items ?? []) {
    const externalId = item.MessageId || item.Uuid?.[0];
    const sender = item.From?.Address;
    if (!externalId || !sender) continue;

    const outcome = await storeIncomingMessage({
      channel: "email",
      externalId,
      sender: sender.toLowerCase(),
      senderName: item.From?.Name ?? null,
      subject: item.Subject ?? "(sans objet)",
      // Brevo's extracted message drops quoted replies and the signature,
      // which is what an inbox wants to show; the raw text is the fallback.
      body: item.ExtractedMarkdownMessage?.trim() || item.RawTextBody?.trim() || "",
      receivedAt: item.SentAtDate,
    });
    if (outcome === "error") failed++;
  }

  if (failed > 0) return NextResponse.json({ error: `${failed} message(s) not stored` }, { status: 500 });
  return NextResponse.json({ ok: true });
}
