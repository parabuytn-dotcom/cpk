import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/engine";

/**
 * Picks the validated suggestion with the most votes (excluding past
 * winners), posts it to the feed as the "Daily Upgrades" system account,
 * marks it as won, and clears the votes table for the next month. Called
 * once a month by /api/cron/suggestions.
 */
export async function pickMonthlySuggestionWinner() {
  const adminClient = createAdminClient();
  if (!adminClient) return { winnerId: null };

  const [{ data: suggestions }, { data: counts }] = await Promise.all([
    adminClient
      .from("suggestions")
      .select("id, title, content, author_id")
      .eq("status", "validated")
      .is("won_at", null),
    adminClient.rpc("get_suggestion_vote_counts"),
  ]);

  if (!suggestions || suggestions.length === 0) {
    await adminClient.from("suggestion_votes").delete().not("user_id", "is", null);
    return { winnerId: null };
  }

  const voteCounts = new Map<string, number>(
    (counts ?? []).map((row: { suggestion_id: string; votes: number }) => [row.suggestion_id, row.votes]),
  );

  const winner = suggestions
    .map((s) => ({ ...s, votes: voteCounts.get(s.id) ?? 0 }))
    .filter((s) => s.votes > 0)
    .sort((a, b) => b.votes - a.votes)[0];

  // Always clear the votes table at month-end, whether or not there was a
  // winner, so the next month starts from zero.
  await adminClient.from("suggestion_votes").delete().not("user_id", "is", null);

  if (!winner) return { winnerId: null };

  await adminClient.from("feed_posts").insert({
    author_id: null,
    system_label: "Daily Upgrades",
    content: `💡 Idée du mois : « ${winner.title} »\n\n${winner.content}`,
  });

  await adminClient.from("suggestions").update({ won_at: new Date().toISOString() }).eq("id", winner.id);

  if (winner.author_id) {
    await notify(
      winner.author_id,
      "suggestion_won",
      `Ton idée « ${winner.title} » a été choisie comme idée du mois !`,
      `/idees/${winner.id}`,
    );
  }

  return { winnerId: winner.id };
}
