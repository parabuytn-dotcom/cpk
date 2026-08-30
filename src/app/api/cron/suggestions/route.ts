import { NextResponse } from "next/server";
import { pickMonthlySuggestionWinner } from "@/lib/suggestions/monthly";

/**
 * GET /api/cron/suggestions
 * Triggered daily by Vercel Cron (see vercel.json) at 22:00 UTC. Vercel
 * automatically sends `Authorization: Bearer $CRON_SECRET` for cron
 * invocations, which we check below. Runs the actual monthly draw only on
 * the last day of the month — 22:00 UTC / 23:00 Tunis is comfortably before
 * midnight in both timezones, so a plain UTC date comparison is safe here.
 *
 * `?force=1` skips the last-day check — same secret required — so the draw
 * can be tested on demand instead of waiting for month-end.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("force") !== "1") {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(now.getUTCDate() + 1);
    if (tomorrow.getUTCMonth() === now.getUTCMonth()) {
      return NextResponse.json({ skipped: true });
    }
  }

  const result = await pickMonthlySuggestionWinner();
  return NextResponse.json(result);
}
