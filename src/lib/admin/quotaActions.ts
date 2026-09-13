"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getSmsBalance } from "@/lib/admin/data";
import type { FormState } from "./schemas";

/**
 * "add" tops the plan up by N on top of what's left; "set" overwrites the
 * balance outright, to line it back up with what the carrier actually reports.
 * Either way the snapshot is re-taken now, so only SMS sent from this moment
 * on are subtracted from it.
 */
export async function adjustSmsBalance(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const mode = formData.get("mode");
  const amount = Number(formData.get("amount"));
  if (mode !== "add" && mode !== "set") return { message: "Action invalide." };
  if (!Number.isInteger(amount) || amount < 0) {
    return { message: "Saisis un nombre entier positif." };
  }
  if (mode === "add" && amount === 0) return { message: "Saisis un nombre de SMS à ajouter." };

  const current = await getSmsBalance();
  const balance = mode === "add" ? (current?.remaining ?? 0) + amount : amount;

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert([
    { key: "sms_balance", value: String(balance) },
    { key: "sms_balance_set_at", value: new Date().toISOString() },
  ]);
  if (error) return { message: error.message };

  revalidatePath("/admin/sms");
  return {
    success: mode === "add" ? `${amount} SMS ajoutés — solde : ${balance}.` : `Solde fixé à ${balance} SMS.`,
  };
}

export async function updateEmailDailyLimit(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const limit = Number(formData.get("limit"));
  if (!Number.isInteger(limit) || limit < 1) return { message: "Saisis un nombre entier positif." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "email_daily_limit", value: String(limit) });
  if (error) return { message: error.message };

  revalidatePath("/admin/emails");
  return { success: `Limite fixée à ${limit} emails par jour.` };
}
