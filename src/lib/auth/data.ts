import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChildLoginClass = { id: string; name: string };

export type ChildLoginStudent = {
  id: string;
  firstName: string;
  lastName: string | null;
  classId: string | null;
  hasAccount: boolean;
};

// The "Je suis un enfant" login picker runs before any session exists, so it
// can't go through the regular RLS-gated client (classes/students both
// require an authenticated caller). The admin client bypasses that safely
// here because we only ever return first/last name + class — nothing
// sensitive (no CIN, phone, parent info) — server-side, never as raw rows.
export async function listChildLoginOptions(): Promise<{
  classes: ChildLoginClass[];
  students: ChildLoginStudent[];
}> {
  const adminClient = createAdminClient();
  if (!adminClient) return { classes: [], students: [] };

  const [{ data: classes }, { data: students }] = await Promise.all([
    adminClient.from("classes").select("id, name").order("name"),
    adminClient
      .from("students")
      .select("id, first_name, last_name, class_id, user_id")
      .order("first_name"),
  ]);

  return {
    classes: classes ?? [],
    students: (students ?? []).map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      classId: s.class_id,
      hasAccount: s.user_id !== null,
    })),
  };
}
