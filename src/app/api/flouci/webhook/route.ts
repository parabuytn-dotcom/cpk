import { NextResponse } from "next/server";
import { confirmDonation } from "@/lib/donations/confirm";

/**
 * Flouci's payment webhook. The donation id is carried in the query string we
 * set when generating the payment, so nothing is read from the request body —
 * the real status is always re-fetched from Flouci's verify_payment API by
 * confirmDonation(). Accepts both verbs since the callback method isn't
 * contractual.
 */
async function handle(request: Request) {
  const donationId = new URL(request.url).searchParams.get("don");
  if (!donationId) return NextResponse.json({ error: "Missing don" }, { status: 400 });

  const outcome = await confirmDonation(donationId);
  if (outcome === "unknown") {
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: outcome });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
