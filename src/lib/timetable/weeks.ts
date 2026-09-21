import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { schoolCalendarDay } from "@/lib/schoolTime";

// Fortnightly lessons: the school alternates week A and week B. Everything is
// derived from one reference Monday stored in site_settings (week_a_start), so
// there is nothing to maintain week after week.

export const WEEK_A_START_KEY = "week_a_start";

export type WeekParity = "A" | "B";

export function parityFor(reference: Date, day: Date): WeekParity {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.floor((schoolCalendarDay(day).getTime() - schoolCalendarDay(reference).getTime()) / weekMs);
  // Negative weeks (a date before the reference) still alternate correctly.
  return ((weeks % 2) + 2) % 2 === 0 ? "A" : "B";
}

export async function getCurrentWeekParity(now = new Date()): Promise<{ parity: WeekParity; configured: boolean }> {
  const db = createAdminClient();
  const { data } = (await db?.from("site_settings").select("value").eq("key", WEEK_A_START_KEY).maybeSingle()) ?? {};
  const raw = data?.value;
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { parity: "A", configured: false };
  return { parity: parityFor(new Date(`${raw}T12:00:00Z`), now), configured: true };
}

/** The half-groups this person belongs to — they only see their own lessons. */
export async function getMyClassGroups(profileId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("class_group_members").select("class_group_id").eq("user_id", profileId);
  return (data ?? []).map((row) => row.class_group_id);
}
