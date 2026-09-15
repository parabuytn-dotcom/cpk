import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSmsPriorityTick } from "@/lib/sms/schoolSms";

export const maxDuration = 60;

function sameSecret(given: string, expected: string | null | undefined) {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/cron/sms-priority
 * Called every 5 minutes by pg_cron in Supabase (Vercel's free crons only run
 * daily). The bearer secret lives in public.private_settings, readable only
 * with the service role, so no extra Vercel variable is needed; CRON_SECRET
 * is accepted too for a manual run.
 */
export async function POST(request: Request) {
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const db = createAdminClient();
  if (!db || !given) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await db.from("private_settings").select("value").eq("key", "cron_secret").maybeSingle();
  if (!sameSecret(given, data?.value) && !sameSecret(given, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await runSmsPriorityTick());
}
