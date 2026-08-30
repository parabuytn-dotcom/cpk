import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";

export type SuggestionSummary = {
  id: string;
  title: string;
  createdAt: string;
  votes: number;
  wonAt: string | null;
};

type VoteCountRow = { suggestion_id: string; votes: number };

export async function listValidatedSuggestions(): Promise<SuggestionSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [{ data }, { data: rawCounts }] = await Promise.all([
    supabase
      .from("suggestions")
      .select("id, title, created_at, won_at")
      .eq("status", "validated")
      .order("validated_at", { ascending: false }),
    supabase.rpc("get_suggestion_vote_counts"),
  ]);
  const counts = (rawCounts ?? []) as VoteCountRow[];

  const voteCounts = new Map(counts.map((row) => [row.suggestion_id, row.votes]));

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      title: row.title ?? "Sans titre",
      createdAt: row.created_at,
      votes: voteCounts.get(row.id) ?? 0,
      wonAt: row.won_at,
    }))
    .sort((a, b) => b.votes - a.votes);
}

export async function getMyVote(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("suggestion_votes")
    .select("suggestion_id")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.suggestion_id ?? null;
}

export type SuggestionDetail = {
  id: string;
  title: string | null;
  content: string;
  status: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  votes: number;
  wonAt: string | null;
};

export async function getSuggestionDetail(id: string): Promise<SuggestionDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const [{ data }, { data: rawCounts }] = await Promise.all([
    supabase
      .from("suggestions")
      .select("id, title, content, status, author_id, created_at, won_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.rpc("get_suggestion_vote_counts"),
  ]);
  const counts = (rawCounts ?? []) as VoteCountRow[];

  if (!data) return null;

  const profiles = data.author_id ? await getPublicProfiles(supabase, [data.author_id]) : new Map();
  const author = data.author_id ? profiles.get(data.author_id) : undefined;
  const votes = counts.find((row) => row.suggestion_id === id)?.votes ?? 0;

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    status: data.status,
    authorName: author?.displayName ?? "Anonyme",
    authorAvatarUrl: author?.avatarUrl ?? null,
    createdAt: data.created_at,
    votes,
    wonAt: data.won_at,
  };
}
