import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { normalizeSmsSender, storeIncomingMessage } from "@/lib/inbox/store";

/**
 * POST /api/sms/received — called by "SMS Gateway for Android" on the school's
 * phone each time a text arrives (event `sms:received`).
 *
 * Authenticated by the app's own signature: X-Signature is the hex
 * HMAC-SHA256 of the raw body followed by X-Timestamp, keyed with the signing
 * key shown in the app (Settings > Webhooks > Signing Key), which must be copied
 * into SMS_WEBHOOK_SIGNING_KEY. Without that key every call is refused — this
 * URL is public, and an unsigned request could plant fake messages.
 *
 * No freshness window on the timestamp: the app retries a failed delivery for
 * up to two days, and a replayed message is harmless anyway since the store
 * dedupes on the gateway's messageId.
 */
export async function POST(request: Request) {
  const signingKey = process.env.SMS_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    return NextResponse.json({ error: "SMS_WEBHOOK_SIGNING_KEY is not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-signature") ?? "";
  const timestamp = request.headers.get("x-timestamp") ?? "";

  const expected = createHmac("sha256", signingKey).update(raw + timestamp).digest("hex");
  const given = Buffer.from(signature, "hex");
  const wanted = Buffer.from(expected, "hex");
  if (!timestamp || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { messageId?: string; message?: string; sender?: string; receivedAt?: string };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Other events (sent, delivered, ping…) aren't for the inbox — acknowledge so
  // the app doesn't keep retrying them.
  if (event.event !== "sms:received") return NextResponse.json({ ok: true, ignored: true });

  const { messageId, message, sender, receivedAt } = event.payload ?? {};
  if (!messageId || !sender || typeof message !== "string") {
    return NextResponse.json({ error: "Incomplete payload" }, { status: 400 });
  }

  const outcome = await storeIncomingMessage({
    channel: "sms",
    externalId: messageId,
    sender: normalizeSmsSender(sender),
    body: message,
    receivedAt,
  });

  // 5xx so the app retries later instead of dropping the text.
  if (outcome === "error") return NextResponse.json({ error: "Storage failed" }, { status: 500 });
  return NextResponse.json({ ok: true, outcome });
}
