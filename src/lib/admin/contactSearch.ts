"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export type ContactChannel = "email" | "sms";

export type ContactSuggestion = {
  /** Exactly what gets added to the recipients field. */
  value: string;
  name: string | null;
  lastUsedAt: string | null;
};

const MAX_RESULTS = 8;

/**
 * Finds addresses or numbers the school has already been in touch with — past
 * recipients, people who wrote in, and site accounts — by address/number or by
 * name, so a recurring correspondent never has to be retyped.
 *
 * The query is stripped of the characters that carry meaning in a PostgREST
 * filter (`%`, `*`, `,`, parentheses, quotes) before it's interpolated into `.or()`,
 * so a search can only ever match, never rewrite the filter.
 */
export async function searchContacts(channel: ContactChannel, rawQuery: string): Promise<ContactSuggestion[]> {
  await requireAdmin();

  const query = rawQuery.replace(/[%,()*\\"']/g, " ").trim().slice(0, 60);
  if (query.length < 2) return [];

  const supabase = await createClient();
  const found = new Map<string, ContactSuggestion>();
  const keep = (value: string | null, name: string | null, lastUsedAt: string | null) => {
    if (!value) return;
    const key = channel === "email" ? value.toLowerCase() : value;
    const existing = found.get(key);
    if (!existing) {
      found.set(key, { value: key, name, lastUsedAt });
      return;
    }
    if (!existing.name && name) existing.name = name;
    if (lastUsedAt && (!existing.lastUsedAt || lastUsedAt > existing.lastUsedAt)) existing.lastUsedAt = lastUsedAt;
  };

  if (channel === "email") {
    const [sent, received, profiles] = await Promise.all([
      supabase
        .from("email_logs")
        .select("recipient, created_at")
        .ilike("recipient", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("inbox_messages")
        .select("sender, sender_name, received_at")
        .eq("channel", "email")
        .or(`sender.ilike.%${query}%,sender_name.ilike.%${query}%`)
        .order("received_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("contact_email, full_name, parent_first_name, parent_last_name")
        .not("contact_email", "is", null)
        .or(`contact_email.ilike.%${query}%,full_name.ilike.%${query}%,parent_first_name.ilike.%${query}%,parent_last_name.ilike.%${query}%`)
        .limit(20),
    ]);

    for (const row of profiles.data ?? []) {
      keep(row.contact_email, row.full_name ?? ([row.parent_first_name, row.parent_last_name].filter(Boolean).join(" ") || null), null);
    }
    for (const row of received.data ?? []) keep(row.sender, row.sender_name, row.received_at);
    for (const row of sent.data ?? []) keep(row.recipient, null, row.created_at);
  } else {
    const digits = query.replace(/\D/g, "");
    const byNumber = digits.length >= 2;

    const [sent, received, profiles] = await Promise.all([
      byNumber
        ? supabase
            .from("sms_logs")
            .select("phone, created_at")
            .ilike("phone", `%${digits}%`)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] as { phone: string; created_at: string }[] }),
      byNumber
        ? supabase
            .from("inbox_messages")
            .select("sender, received_at")
            .eq("channel", "sms")
            .ilike("sender", `%${digits}%`)
            .order("received_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as { sender: string; received_at: string }[] }),
      supabase
        .from("profiles")
        .select("phone, full_name, parent_first_name, parent_last_name")
        .not("phone", "is", null)
        .or(
          [
            byNumber ? `phone.ilike.%${digits}%` : null,
            `full_name.ilike.%${query}%`,
            `parent_first_name.ilike.%${query}%`,
            `parent_last_name.ilike.%${query}%`,
          ]
            .filter(Boolean)
            .join(","),
        )
        .limit(20),
    ]);

    for (const row of profiles.data ?? []) {
      keep(row.phone, row.full_name ?? ([row.parent_first_name, row.parent_last_name].filter(Boolean).join(" ") || null), null);
    }
    // The recipients field only accepts 8-digit local numbers.
    for (const row of received.data ?? []) if (/^\d{8}$/.test(row.sender)) keep(row.sender, null, row.received_at);
    for (const row of sent.data ?? []) if (/^\d{8}$/.test(row.phone)) keep(row.phone, null, row.created_at);
  }

  // A number or address matched only in the send history carries no name —
  // look up whether it belongs to an account, so the list shows who it is.
  const unnamed = [...found.values()].filter((s) => !s.name).map((s) => s.value);
  if (unnamed.length > 0) {
    const column = channel === "email" ? "contact_email" : "phone";
    const { data: owners } = await supabase
      .from("profiles")
      .select(`${column}, full_name, parent_first_name, parent_last_name`)
      .in(column, unnamed);
    for (const owner of (owners ?? []) as Record<string, string | null>[]) {
      const key = channel === "email" ? owner[column]?.toLowerCase() : owner[column];
      const suggestion = key ? found.get(key) : undefined;
      if (suggestion && !suggestion.name) {
        suggestion.name =
          owner.full_name ?? ([owner.parent_first_name, owner.parent_last_name].filter(Boolean).join(" ") || null);
      }
    }
  }

  const needle = query.toLowerCase();
  const startsWith = (s: ContactSuggestion) =>
    s.value.toLowerCase().startsWith(needle) || (s.name?.toLowerCase().startsWith(needle) ?? false);

  // Best match first, then whoever was contacted most recently.
  return [...found.values()]
    .sort((a, b) => {
      const prefix = Number(startsWith(b)) - Number(startsWith(a));
      if (prefix !== 0) return prefix;
      return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
    })
    .slice(0, MAX_RESULTS);
}
