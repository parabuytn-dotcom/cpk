"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { submitSuggestionSchema, type FormState } from "./schemas";

export async function submitSuggestion(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) return { message: "Connecte-toi d'abord." };

  const validated = submitSuggestionSchema.safeParse({ content: formData.get("content") });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("suggestions").insert({
    author_id: profile.id,
    content: validated.data.content,
  });

  if (error) return { message: error.message };

  revalidatePath("/idees");
  return { success: "Ta proposition a été envoyée — elle sera visible après validation." };
}
