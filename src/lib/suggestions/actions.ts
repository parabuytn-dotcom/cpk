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

// A user has at most one active vote at a time, across ALL suggestions —
// `suggestion_votes.user_id` is the primary key, so voting for a new idea is
// a plain upsert that moves the existing row (this is how "changing your
// mind" works, with no separate unvote step needed).
export async function voteForSuggestion(suggestionId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Connecte-toi d'abord.");

  const supabase = await createClient();

  const { data: suggestion } = await supabase
    .from("suggestions")
    .select("won_at")
    .eq("id", suggestionId)
    .maybeSingle();
  if (suggestion?.won_at) throw new Error("Cette idée a déjà été élue idée du mois.");

  const { error } = await supabase
    .from("suggestion_votes")
    .upsert(
      { user_id: profile.id, suggestion_id: suggestionId, created_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) throw new Error(error.message);
  revalidatePath("/idees");
}

export async function removeMyVote() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Connecte-toi d'abord.");

  const supabase = await createClient();
  const { error } = await supabase.from("suggestion_votes").delete().eq("user_id", profile.id);

  if (error) throw new Error(error.message);
  revalidatePath("/idees");
}
