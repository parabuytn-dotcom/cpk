"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { dispatchSmsQueue } from "@/lib/sms/schoolSms";

/** The "send anyway" link from the missing-SMS text: spends down to the codes' and alerts' reserve. */
export async function forceSmsQueue(): Promise<{ message: string; ok: boolean }> {
  await requireAdmin();
  const { sent, held } = await dispatchSmsQueue({ force: true });
  revalidatePath("/admin/sms");
  if (sent === 0 && held > 0) {
    return {
      ok: false,
      message: `Aucun SMS envoyé : le solde restant est réservé aux codes de vérification et aux alertes de recharge. ${held} SMS toujours en attente.`,
    };
  }
  return {
    ok: true,
    message: held > 0 ? `${sent} SMS envoyés, ${held} toujours en attente faute de solde.` : `${sent} SMS envoyés.`,
  };
}
