import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { sendSms, type SmsTrigger } from "@/lib/smsService";

const bodySchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
  trigger: z.enum(["teacher_absence", "generated_password", "manual"]).optional(),
});

/**
 * POST /api/sms/send
 * Admin-only webhook used by the admin dashboard to trigger an SMS through
 * the local gateway (see lib/smsService.ts). Not intended to be called from
 * untrusted clients.
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { phone, message, trigger } = parsed.data;
  const result = await sendSms(phone, message, trigger as SmsTrigger | undefined);

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
