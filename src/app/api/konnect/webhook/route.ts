import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKonnectPaymentDetails } from "@/lib/konnect/client";
import { notify } from "@/lib/notifications/engine";

/**
 * GET /api/konnect/webhook?payment_ref=...
 * Konnect calls this with only a payment_ref — never a status — so the
 * status is always re-fetched from their API here rather than trusted from
 * the query string. The `.eq("status", "pending")` update guard makes this
 * idempotent against duplicate webhook deliveries.
 */
export async function GET(request: Request) {
  const paymentRef = new URL(request.url).searchParams.get("payment_ref");
  if (!paymentRef) return NextResponse.json({ error: "Missing payment_ref" }, { status: 400 });

  const details = await getKonnectPaymentDetails(paymentRef);
  if (!details) return NextResponse.json({ error: "Unable to verify payment" }, { status: 502 });

  const adminClient = createAdminClient();
  if (!adminClient) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const status = details.status === "completed" ? "completed" : "failed";

  const { data: donation } = await adminClient
    .from("donations")
    .update({ status, confirmed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("payment_ref", paymentRef)
    .eq("status", "pending")
    .select("id, donor_id, amount")
    .maybeSingle();

  if (donation && status === "completed") {
    const amountTnd = (donation.amount / 1000).toFixed(3).replace(/\.?0+$/, "");

    if (donation.donor_id) {
      await notify(donation.donor_id, "donation_thanks", `Merci pour ton don de ${amountTnd} DT ! 💙`);
    }

    const { data: admins } = await adminClient.from("profiles").select("id").eq("role", "admin");
    if (admins) {
      await Promise.all(
        admins.map((admin) =>
          notify(admin.id, "donation_received", `Nouveau don reçu : ${amountTnd} DT.`, "/admin/dons"),
        ),
      );
    }
  }

  return NextResponse.json({ ok: true });
}
