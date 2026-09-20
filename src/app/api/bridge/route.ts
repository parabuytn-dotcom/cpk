import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSms } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { renderEmail, plainTextToHtml } from "@/lib/emailTemplate";
import { getSmsPlanState } from "@/lib/sms/balance";
import { floorFor } from "@/lib/sms/ladder";
import { getEmailQuota } from "@/lib/admin/data";
import { countSmsSegments } from "@/lib/smsSegments";

export const maxDuration = 60;

/**
 * POST /api/bridge
 * The sister site (LPK Learn, for the lycée) sends its SMS and emails through
 * here. Both sites share one SIM and one Brevo account, so they must share one
 * counter: keeping the credentials and the ledger in a single place is the only
 * way the remaining balance is ever right. Every send lands in this site's
 * sms_logs / email_logs and obeys the same priority ladder, so a text from the
 * lycée can never eat the collège's reserved verification codes.
 *
 * Authorised by a shared secret (BRIDGE_SECRET) — never exposed to browsers.
 */

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("quota") }),
  z.object({
    action: z.literal("sms"),
    phone: z.string().min(8).max(20),
    message: z.string().min(1).max(1000),
  }),
  z.object({
    action: z.literal("email"),
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    /** Plain text, wrapped in the school template here. */
    body: z.string().max(10000).optional(),
    /** Already-rendered HTML, sent as is. */
    html: z.string().max(200000).optional(),
  }),
]);

function authorised(request: Request) {
  const expected = process.env.BRIDGE_SECRET;
  if (!expected) return false;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const payload = parsed.data;

  if (payload.action === "quota") {
    const [plan, email] = await Promise.all([getSmsPlanState(), getEmailQuota()]);
    return NextResponse.json({
      sms: plan
        ? {
            remaining: plan.remaining,
            // What a school message may actually spend: the codes' and the
            // recharge alerts' share is off limits.
            usable: Math.max(plan.remaining - floorFor("school", plan.alertsLeft), 0),
          }
        : null,
      email: { remaining: email.remaining, total: email.total },
    });
  }

  if (payload.action === "sms") {
    const result = await sendSms(payload.phone, payload.message, "manual");
    return NextResponse.json({
      ...result,
      segments: countSmsSegments(payload.message),
    });
  }

  const html =
    payload.html ?? renderEmail({ title: payload.subject, bodyHtml: plainTextToHtml(payload.body ?? "") });
  const result = await sendEmail(payload.to, payload.subject, html, { logBody: payload.body ?? "" });
  return NextResponse.json(result);
}
