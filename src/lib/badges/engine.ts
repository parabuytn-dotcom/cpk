import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Awards a badge to a user if they don't already have it. Uses the
 * service-role client because these checks run as a side effect of an
 * ordinary user's action (uploading a course, checking off homework...) and
 * `user_badges` writes are otherwise admin-only per RLS.
 */
async function awardBadge(userId: string, code: string) {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  const { data: badge } = await adminClient.from("badges").select("id").eq("code", code).maybeSingle();
  if (!badge) return;

  await adminClient
    .from("user_badges")
    .insert({ user_id: userId, badge_id: badge.id })
    .select()
    .maybeSingle(); // errors on conflict are ignored — "already has it" isn't a failure.
}

/** "Toujours à Jour" — devoirs cochés 5 jours consécutifs. */
export async function checkToujoursAJour(studentId: string) {
  const supabase = await createClient();
  const { data: completions } = await supabase
    .from("homework_completions")
    .select("completed_at")
    .eq("student_id", studentId)
    .order("completed_at", { ascending: false })
    .limit(60);

  if (!completions || completions.length === 0) return;

  const days = new Set(
    completions.map((c) => new Date(c.completed_at).toISOString().slice(0, 10)),
  );

  let streak = 0;
  let maxStreak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  if (maxStreak >= 5) await awardBadge(studentId, "toujours_a_jour");
}

/** "Journaliste CPK" — publications régulières sur le feed (seuil : 10 posts). */
export async function checkJournalisteCpk(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("feed_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId);

  if ((count ?? 0) >= 10) await awardBadge(userId, "journaliste_cpk");
}
