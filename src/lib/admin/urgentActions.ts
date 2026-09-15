"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { getSmsPlanState } from "@/lib/sms/balance";
import { floorFor } from "@/lib/sms/ladder";
import { getEmailQuota } from "@/lib/admin/data";
import { displayName, resolveAudience, resolveContacts } from "@/lib/urgent/engine";
import { cancelBroadcast, scheduleBroadcast } from "@/lib/urgent/schedule";

const audienceSchema = z.object({
  audience: z.enum(["all", "parents", "teachers", "students", "class", "person"]),
  classId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
});

export type UrgentPerson = {
  id: string;
  name: string;
  role: string;
  /** "Parent de Sami (7B)", "Élève en 8A", or the phone number. */
  detail: string;
  hasPhone: boolean;
};

/**
 * Finds one person to write to — by their own name or phone, or by a child's
 * name, which returns the child's parent: convoking a parent usually starts
 * from the pupil.
 */
export async function searchUrgentPeople(rawQuery: string): Promise<UrgentPerson[]> {
  await requireAdmin();
  // Characters that carry meaning in a PostgREST filter are stripped before
  // the query goes into .or(), so a search can only match, never rewrite it.
  const query = rawQuery.replace(/[%,()*\\"'.:]/g, " ").trim().slice(0, 60);
  if (query.length < 2) return [];
  const db = createAdminClient();
  if (!db) return [];

  const like = `%${query}%`;
  const [{ data: byProfile }, { data: byChild }] = await Promise.all([
    db
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.${like},parent_first_name.ilike.${like},parent_last_name.ilike.${like},phone.ilike.${like}`)
      .limit(15),
    db
      .from("students")
      .select("parent_id, user_id")
      .or(`first_name.ilike.${like},last_name.ilike.${like}`)
      .limit(15),
  ]);

  const ids = Array.from(
    new Set([
      ...(byProfile ?? []).map((p) => p.id),
      ...(byChild ?? []).flatMap((s) => [s.parent_id, s.user_id]).filter((id): id is string => Boolean(id)),
    ]),
  ).slice(0, 20);
  if (ids.length === 0) return [];

  const [{ data: people }, { data: children }] = await Promise.all([
    db.from("profiles").select("id, full_name, parent_first_name, parent_last_name, role, phone").in("id", ids),
    db.from("students").select("parent_id, user_id, first_name, class_name").or(`parent_id.in.(${ids.join(",")}),user_id.in.(${ids.join(",")})`),
  ]);

  const roleLabels: Record<string, string> = {
    parent: "Parent",
    student: "Élève",
    teacher: "Professeur",
    staff: "Staff",
    director: "Direction",
    admin: "Admin",
  };

  return (people ?? [])
    .map((p) => {
      const kids = (children ?? []).filter((c) => c.parent_id === p.id);
      const own = (children ?? []).find((c) => c.user_id === p.id);
      const detail =
        p.role === "parent" && kids.length > 0
          ? `Parent de ${kids.map((k) => `${k.first_name} (${k.class_name})`).join(", ")}`
          : p.role === "student" && own
            ? `Élève en ${own.class_name}`
            : (roleLabels[p.role] ?? p.role);
      return {
        id: p.id,
        name: displayName(p),
        role: roleLabels[p.role] ?? p.role,
        detail,
        hasPhone: (p.phone ?? "").replace(/\D/g, "").length >= 8,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export type UrgentPreview =
  | {
      ok: true;
      people: number;
      phones: number;
      emails: number;
      smsUsable: number | null;
      emailRemaining: number;
    }
  | { ok: false; error: string };

/** Who a broadcast would reach, and what's left to reach them with. */
export async function previewUrgent(input: { audience: string; classId?: string; personId?: string }): Promise<UrgentPreview> {
  await requireAdmin();
  const parsed = audienceSchema.safeParse({
    audience: input.audience,
    classId: input.classId || undefined,
    personId: input.personId || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Destinataires invalides." };
  const db = createAdminClient();
  if (!db) return { ok: false, error: "Supabase (clé service_role) n'est pas configuré." };

  const { ids } = await resolveAudience(db, parsed.data.audience, parsed.data.classId, parsed.data.personId);
  const [{ phones, emails }, plan, quota] = await Promise.all([
    resolveContacts(db, ids),
    getSmsPlanState(),
    getEmailQuota(),
  ]);
  return {
    ok: true,
    people: ids.length,
    phones: phones.length,
    emails: emails.length,
    smsUsable: plan ? Math.max(plan.remaining - floorFor("school", plan.alertsLeft), 0) : null,
    emailRemaining: quota.remaining,
  };
}

const sendSchema = audienceSchema.extend({
  subject: z.string().trim().min(1, "Donne un titre au message.").max(120, "Titre trop long."),
  message: z.string().trim().min(1, "Message vide.").max(1000, "Message trop long."),
  channels: z.object({
    email: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(3),
      intervalMinutes: z.number().int().min(5).max(1440),
    }),
    sms: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(10),
      intervalMinutes: z.number().int().min(5).max(1440),
    }),
    notification: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(12),
      intervalMinutes: z.number().int().min(5).max(1440),
      intrusive: z.boolean(),
    }),
  }),
});

export type UrgentSendInput = z.input<typeof sendSchema>;

export async function sendUrgent(input: UrgentSendInput): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const parsed = sendSchema.safeParse({
    ...input,
    classId: input.classId || undefined,
    personId: input.personId || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { audience, classId, personId, subject, message, channels } = parsed.data;

  if (audience === "class" && !classId) return { ok: false, error: "Choisis une classe." };
  if (audience === "person" && !personId) return { ok: false, error: "Choisis la personne à prévenir." };

  const db = createAdminClient();
  if (!db) return { ok: false, error: "Supabase (clé service_role) n'est pas configuré." };

  const { ids, label } = await resolveAudience(db, audience, classId, personId);
  if (ids.length === 0) return { ok: false, error: "Aucun membre du site ne correspond à ces destinataires." };

  const result = await scheduleBroadcast(db, {
    kind: "urgent",
    subject,
    message,
    audience,
    audienceLabel: label,
    recipientIds: ids,
    channels,
    createdBy: admin.id,
    single: audience === "person",
  });
  revalidatePath("/admin/urgent");
  return result.ok ? { ok: true, summary: result.summary } : result;
}

export async function cancelUrgent(broadcastId: string) {
  await requireAdmin();
  const db = createAdminClient();
  if (!db) return;
  await cancelBroadcast(db, broadcastId);
  revalidatePath("/admin/urgent");
}
