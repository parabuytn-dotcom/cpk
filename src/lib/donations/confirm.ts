import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFlouciPaymentStatus } from "@/lib/flouci/client";
import { notify } from "@/lib/notifications/engine";

export type DonationOutcome = "completed" | "failed" | "pending" | "unknown";

/**
 * Re-checks a donation's real status with Flouci and records it. Called from
 * both the webhook and the success page so a donation still settles if one of
 * the two never arrives. Safe to call twice: the `.eq("status", "pending")`
 * guard means only the first caller to see a settled payment writes the row
 * and sends the notifications.
 */
export async function confirmDonation(donationId: string): Promise<DonationOutcome> {
  const adminClient = createAdminClient();
  if (!adminClient) return "unknown";

  const { data: donation } = await adminClient
    .from("donations")
    .select("id, payment_ref, status")
    .eq("id", donationId)
    .maybeSingle();

  if (!donation) return "unknown";
  if (donation.status !== "pending") return donation.status as DonationOutcome;
  if (!donation.payment_ref) return "unknown";

  const payment = await getFlouciPaymentStatus(donation.payment_ref);
  if (!payment) return "unknown";
  // Still in progress — leave the row alone so a later call can settle it.
  if (payment.status === "PENDING") return "pending";

  const status = payment.success && payment.status === "SUCCESS" ? "completed" : "failed";

  const { data: updated } = await adminClient
    .from("donations")
    .update({ status, confirmed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", donation.id)
    .eq("status", "pending")
    .select("id, donor_id, amount")
    .maybeSingle();

  // No row came back: the other caller settled it first and already sent the
  // notifications below.
  if (!updated || status !== "completed") return status;

  const amountTnd = (updated.amount / 1000).toFixed(3).replace(/\.?0+$/, "");

  if (updated.donor_id) {
    await notify(updated.donor_id, "donation_thanks", `Merci pour ton don de ${amountTnd} DT ! 💙`);
  }

  const { data: admins } = await adminClient.from("profiles").select("id").eq("role", "admin");
  if (admins) {
    await Promise.all(
      admins.map((admin) =>
        notify(admin.id, "donation_received", `Nouveau don reçu : ${amountTnd} DT.`, "/admin/dons"),
      ),
    );
  }

  return status;
}
