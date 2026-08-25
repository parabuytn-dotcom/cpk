import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles, type PublicProfile } from "@/lib/social/data";

export type ProfileStats = {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export async function getUserProfile(userId: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const profiles = await getPublicProfiles(supabase, [userId]);
  return profiles.get(userId) ?? null;
}

export async function getProfileStats(userId: string, viewerId?: string): Promise<ProfileStats> {
  if (!isSupabaseConfigured()) {
    return { followerCount: 0, followingCount: 0, isFollowing: false };
  }
  const supabase = await createClient();

  const [{ count: followerCount }, { count: followingCount }, followRow] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    viewerId
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewerId)
          .eq("followed_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing: Boolean(followRow?.data),
  };
}
