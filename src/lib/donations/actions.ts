"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { initFlouciPayment } from "@/lib/flouci/client";
import { SITE_URL } from "@/lib/siteUrl";
import { donationSchema, type FormState } from "./schemas";

export async function startDonation(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = donationSchema.safeParse({ amount: formData.get("amount") });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const amountMillimes = Math.round(validated.data.amount * 1000);
  const supabase = await createClient();

  const { data: donation, error: insertError } = await supabase
    .from("donations")
    .insert({ donor_id: profile.id, amount: amountMillimes })
    .select("id")
    .single();

  if (insertError || !donation) {
    return { message: insertError?.message ?? "Impossible de créer le don." };
  }

  const locale = await getLocale();
  // The donation id travels in the return/webhook URLs we control, so the
  // payment can always be tied back to its row without depending on the shape
  // of whatever Flouci posts to the webhook.
  const result = await initFlouciPayment({
    amountMillimes,
    trackingId: donation.id,
    webhookUrl: `${SITE_URL}/api/flouci/webhook?don=${donation.id}`,
    successUrl: `${SITE_URL}/${locale}/dons/succes?don=${donation.id}`,
    failUrl: `${SITE_URL}/${locale}/dons/echec?don=${donation.id}`,
  });

  if (!result.success) {
    await supabase.from("donations").update({ status: "failed" }).eq("id", donation.id);
    return { message: result.error };
  }

  await supabase.from("donations").update({ payment_ref: result.paymentId }).eq("id", donation.id);

  redirect(result.payUrl);
}
