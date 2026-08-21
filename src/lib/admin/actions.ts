"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { sendSms } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  timetableEntrySchema,
  teacherAbsenceSchema,
  csvRowSchema,
  type FormState,
} from "./schemas";

// ---------------------------------------------------------------------------
// Comptes — validation des inscriptions parents
// ---------------------------------------------------------------------------

export async function validateAccount(profileId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "validated" })
    .eq("id", profileId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/comptes");
}

// ---------------------------------------------------------------------------
// Emploi du temps — import CSV / saisie manuelle
// ---------------------------------------------------------------------------

function detectDelimiter(headerLine: string) {
  return (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ";" : ",";
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

async function findOrCreateTeacherByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fullName: string,
) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const { data: existing } = await supabase
    .from("teachers")
    .select("id")
    .ilike("first_name", firstName)
    .ilike("last_name", lastName)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("teachers")
    .insert({ first_name: firstName, last_name: lastName })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Impossible de créer le professeur.");
  return created.id as string;
}

export async function importTimetableCsv(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const classId = formData.get("classId") as string;
  const className = formData.get("className") as string;
  const csvText = formData.get("csvText") as string;

  if (!classId || !className || !csvText?.trim()) {
    return { message: "Sélectionne une classe et colle le contenu du CSV." };
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { message: "Le CSV est vide ou mal formaté." };
  }

  const supabase = await createClient();
  const entries: {
    class_id: string;
    class_name: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject: string;
    teacher_id: string;
  }[] = [];

  for (const [index, row] of rows.entries()) {
    const validated = csvRowSchema.safeParse(row);
    if (!validated.success) {
      return { message: `Ligne ${index + 2} invalide : vérifie les colonnes Jour/Heure_Début/Heure_Fin/Matière/Professeur.` };
    }
    const teacherId = await findOrCreateTeacherByName(supabase, validated.data.Professeur);
    entries.push({
      class_id: classId,
      class_name: className,
      day_of_week: validated.data.Jour,
      start_time: validated.data.Heure_Début,
      end_time: validated.data.Heure_Fin,
      subject: validated.data.Matière,
      teacher_id: teacherId,
    });
  }

  const { error } = await supabase.from("timetable_entries").insert(entries);
  if (error) return { message: error.message };

  revalidatePath("/admin/emploi-du-temps");
  return { success: `${entries.length} créneaux importés.` };
}

export async function upsertTimetableEntry(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const validated = timetableEntrySchema.safeParse({
    classId: formData.get("classId"),
    className: formData.get("className"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    subject: formData.get("subject"),
    teacherName: formData.get("teacherName"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const teacherId = await findOrCreateTeacherByName(supabase, validated.data.teacherName);

  const { error } = await supabase.from("timetable_entries").insert({
    class_id: validated.data.classId,
    class_name: validated.data.className,
    day_of_week: validated.data.dayOfWeek,
    start_time: validated.data.startTime,
    end_time: validated.data.endTime,
    subject: validated.data.subject,
    teacher_id: teacherId,
  });

  if (error) return { message: error.message };

  revalidatePath("/admin/emploi-du-temps");
  return { success: "Créneau ajouté." };
}

// ---------------------------------------------------------------------------
// Absences — déclaration + propagation automatique + alerte SMS
// ---------------------------------------------------------------------------

/** day_of_week convention: 1 = Lundi ... 7 = Dimanche (matches schema check). */
function isoWeekday(date: Date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function atTime(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m));
  return d;
}

function everyDayBetween(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // Safety cap matches the 90-day zod validation on the absence window.
  for (let i = 0; cursor <= last && i < 120; i++) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function declareTeacherAbsence(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();

  const validated = teacherAbsenceSchema.safeParse({
    teacherId: formData.get("teacherId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason") ?? undefined,
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { teacherId, reason } = validated.data;
  const startsAt = new Date(validated.data.startsAt);
  const endsAt = new Date(validated.data.endsAt);

  const supabase = await createClient();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("first_name, last_name")
    .eq("id", teacherId)
    .single();

  const { error: absenceError } = await supabase.from("teacher_absences").insert({
    teacher_id: teacherId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: reason || null,
    created_by: admin.id,
  });
  if (absenceError) return { message: absenceError.message };

  // 1. Find every recurring slot for this teacher that falls inside the window.
  const { data: candidateEntries } = await supabase
    .from("timetable_entries")
    .select("id, class_id, class_name, day_of_week, start_time, end_time")
    .eq("teacher_id", teacherId);

  const days = everyDayBetween(startsAt, endsAt);
  const affectedEntryIds = new Set<string>();
  const affectedClasses = new Map<string, string>(); // class_id -> class_name

  for (const entry of candidateEntries ?? []) {
    for (const day of days) {
      if (isoWeekday(day) !== entry.day_of_week) continue;
      const slotStart = atTime(day, entry.start_time);
      const slotEnd = atTime(day, entry.end_time);
      if (slotStart < endsAt && slotEnd > startsAt) {
        affectedEntryIds.add(entry.id);
        affectedClasses.set(entry.class_id, entry.class_name);
        break;
      }
    }
  }

  if (affectedEntryIds.size > 0) {
    await supabase
      .from("timetable_entries")
      .update({ is_cancelled: true })
      .in("id", Array.from(affectedEntryIds));
  }

  // 2. SMS alert to parents of every affected class.
  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : "Le professeur";
  const durationHours = Math.round((endsAt.getTime() - startsAt.getTime()) / 3600000);
  const formatFr = (d: Date) =>
    d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const message = `CPKef Info : ${teacherName} est absent(e) pendant ${durationHours} heure(s), du ${formatFr(startsAt)} au ${formatFr(endsAt)}. Merci de vérifier l'emploi du temps pour les cours annulés.`;

  if (affectedClasses.size > 0) {
    const classNames = Array.from(affectedClasses.values());
    const { data: students } = await supabase
      .from("students")
      .select("parent_id")
      .in("class_name", classNames);

    const parentIds = Array.from(new Set((students ?? []).map((s) => s.parent_id).filter(Boolean)));
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("profiles")
        .select("phone")
        .in("id", parentIds as string[]);

      for (const parent of parents ?? []) {
        if (parent.phone) await sendSms(parent.phone, message, "teacher_absence");
      }
    }
  }

  revalidatePath("/admin/absences");
  revalidatePath("/admin/emploi-du-temps");
  return {
    success: `Absence enregistrée. ${affectedEntryIds.size} créneau(x) annulé(s) sur ${affectedClasses.size} classe(s).`,
  };
}

// ---------------------------------------------------------------------------
// Compte enfant — création 1-clic depuis l'espace parent
// ---------------------------------------------------------------------------

function generatePassword() {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

export async function createChildAccount(
  studentId: string,
): Promise<{ success: true; email: string; password: string } | { success: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "parent") {
    return { success: false, error: "Non autorisé." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, parent_id, user_id")
    .eq("id", studentId)
    .single();

  if (!student || student.parent_id !== profile.id) {
    return { success: false, error: "Élève introuvable." };
  }
  if (student.user_id) {
    return { success: false, error: "Ce compte existe déjà." };
  }

  const password = generatePassword();
  const email = `${student.first_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.${randomBytes(3).toString("hex")}@cpk.internal`;

  const { data: created, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    return { success: false, error: error?.message ?? "Échec de la création du compte." };
  }

  await adminClient.from("profiles").insert({
    id: created.user.id,
    role: "student",
    status: "validated",
  });
  await adminClient.from("students").update({ user_id: created.user.id }).eq("id", studentId);

  // Best-effort: only reachable if the parent's own login email is real
  // (not a CIN-based synthetic @cpk.internal address).
  const {
    data: { user: parentUser },
  } = await supabase.auth.getUser();
  if (parentUser?.email && !parentUser.email.endsWith("@cpk.internal")) {
    await sendEmail(
      parentUser.email,
      "Compte CPK Learn créé pour votre enfant",
      `<p>Identifiants de connexion :</p><p>Email : ${email}<br/>Mot de passe : ${password}</p>`,
    );
  }

  revalidatePath("/dashboard");
  return { success: true, email, password };
}
