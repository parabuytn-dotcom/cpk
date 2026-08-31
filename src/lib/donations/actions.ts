"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { initKonnectPayment } from "@/lib/konnect/client";
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
  const result = await initKonnectPayment({
    amountMillimes,
    description: "Don pour CPK Learn",
    orderId: donation.id,
    webhookUrl: `${SITE_URL}/api/konnect/webhook`,
    successUrl: `${SITE_URL}/${locale}/dons/succes`,
    failUrl: `${SITE_URL}/${locale}/dons/echec`,
  });

  if (!result.success) {
    await supabase.from("donations").update({ status: "failed" }).eq("id", donation.id);
    return { message: result.error };
  }

  await supabase.from("donations").update({ payment_ref: result.paymentRef }).eq("id", donation.id);

  redirect(result.payUrl);
}
