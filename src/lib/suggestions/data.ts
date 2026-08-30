import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getPublicProfiles } from "@/lib/social/data";

export type SuggestionSummary = {
  id: string;
  title: string;
  createdAt: string;
};

export async function listValidatedSuggestions(): Promise<SuggestionSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("suggestions")
    .select("id, title, created_at")
    .eq("status", "validated")
    .order("validated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? "Sans titre",
    createdAt: row.created_at,
  }));
}

export type SuggestionDetail = {
  id: string;
  title: string | null;
  content: string;
  status: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
};

export async function getSuggestionDetail(id: string): Promise<SuggestionDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("suggestions")
    .select("id, title, content, status, author_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const profiles = data.author_id ? await getPublicProfiles(supabase, [data.author_id]) : new Map();
  const author = data.author_id ? profiles.get(data.author_id) : undefined;

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    status: data.status,
    authorName: author?.displayName ?? "Anonyme",
    authorAvatarUrl: author?.avatarUrl ?? null,
    createdAt: data.created_at,
  };
}
