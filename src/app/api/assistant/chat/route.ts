import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askGemini, type ChatTurn } from "@/lib/assistant/gemini";

const bodySchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(20),
});

// Very lightweight per-instance rate limit — no external store, resets on
// redeploy/cold start. Good enough to blunt obvious abuse of the free Gemini
// quota without adding paid infrastructure (Redis, etc.) for a v1.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > RATE_LIMIT;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de messages envoyés, réessaie dans un moment." },
      { status: 429 },
    );
  }

  const json = await request.json().catch(() => null);
  const validated = bodySchema.safeParse(json);
  if (!validated.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await askGemini(validated.data.history as ChatTurn[]);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ reply: result.reply });
}
