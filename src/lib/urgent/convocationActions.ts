"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/session";
import { cancelBroadcast, scheduleBroadcast } from "./schedule";
import { convocationMessage, convocationSubject } from "./convocationMessage";
import { getTeacherScope } from "./convocationData";

// Keeps a teacher's convocations from turning into a way to flood families
// (and the school's SMS plan).
const MAX_PER_DAY = 10;

const schema = z.object({
  studentId: z.string().uuid("Choisis un élève."),
  mode: z.enum(["call", "visit"]),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 8, "Ton numéro doit comporter 8 chiffres."),
  note: z.string().trim().max(300, "Motif trop long (300 caractères maximum)."),
  channels: z.object({
    notification: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(6),
      intervalMinutes: z.number().int().min(5).max(1440),
    }),
    sms: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(5),
      intervalMinutes: z.number().int().min(5).max(1440),
    }),
    email: z.object({
      enabled: z.boolean(),
      count: z.number().int().min(1).max(3),
      intervalMinutes: z.number().int().min(5).max(1440),
    }),
  }),
});

export type ConvocationInput = z.input<typeof schema>;

export async function convokeParent(input: ConvocationInput): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") return { ok: false, error: "Réservé aux professeurs." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { studentId, mode, phone, note, channels } = parsed.data;

  const db = createAdminClient();
  if (!db) return { ok: false, error: "Supabase (clé service_role) n'est pas configuré." };

  const scope = await getTeacherScope(profile.id);
  if (!scope) return { ok: false, error: "Aucune fiche professeur n'est liée à ton compte." };

  // Only a pupil of one of the teacher's own classes.
  const student = scope.students.find((s) => s.id === studentId);
  if (!student) return { ok: false, error: "Cet élève ne fait pas partie de tes classes." };
  if (!student.parentId) return { ok: false, error: "Cet élève n'a pas encore de compte parent : contacte l'administration." };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: today }, { data: active }] = await Promise.all([
    db
      .from("urgent_broadcasts")
      .select("id", { count: "exact", head: true })
      .eq("kind", "convocation")
      .eq("created_by", profile.id)
      .gte("created_at", since),
    db
      .from("urgent_broadcasts")
      .select("id, urgent_deliveries!inner(status)")
      .eq("kind", "convocation")
      .eq("student_id", studentId)
      .is("cancelled_at", null)
      .eq("urgent_deliveries.status", "pending")
      .limit(1),
  ]);
  if ((today ?? 0) >= MAX_PER_DAY) {
    return { ok: false, error: `Tu as déjà envoyé ${MAX_PER_DAY} convocations ces dernières 24 heures.` };
  }
  if (active && active.length > 0) {
    return {
      ok: false,
      error: "Une convocation pour cet élève est déjà en cours d'envoi. Annule-la d'abord si tu veux la refaire.",
    };
  }

  const details = {
    teacherName: scope.teacherName,
    subject: scope.subject,
    childName: student.name,
    className: student.className,
    phone,
    mode,
    note,
  };

  const result = await scheduleBroadcast(db, {
    kind: "convocation",
    subject: convocationSubject(details),
    message: convocationMessage(details),
    audience: "person",
    audienceLabel: `Parent de ${student.name} (${student.className})`,
    recipientIds: [student.parentId],
    channels: {
      ...channels,
      // A convocation should be seen: the first notification blocks the screen.
      notification: { ...channels.notification, intrusive: true },
    },
    createdBy: profile.id,
    studentId,
    single: true,
  });

  revalidatePath("/dashboard");
  return result.ok ? { ok: true, summary: result.summary } : result;
}

export async function cancelConvocation(broadcastId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") return;
  const db = createAdminClient();
  if (!db) return;

  const { data: own } = await db
    .from("urgent_broadcasts")
    .select("id")
    .eq("id", broadcastId)
    .eq("created_by", profile.id)
    .eq("kind", "convocation")
    .maybeSingle();
  if (!own) return;

  await cancelBroadcast(db, broadcastId);
  revalidatePath("/dashboard");
}
