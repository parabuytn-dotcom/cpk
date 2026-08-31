"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { sendSms } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { getCurrentProfile } from "@/lib/auth/session";
import { checkToujoursAJour } from "@/lib/badges/engine";
import { notify, notifyMany } from "@/lib/notifications/engine";
import {
  timetableEntrySchema,
  teacherAbsenceSchema,
  csvRowSchema,
  userUpdateSchema,
  classNameSchema,
  staffMemberSchema,
  releaseSchema,
  helpRequestSchema,
  homeworkSchema,
  examSchema,
  documentAccountSchema,
  createAccountSchema,
  makeupSessionSchema,
  type FormState,
} from "./schemas";
import { buildDocumentsPdf, qrLoginUrl, type DocumentEntry } from "./documentPdf";

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

  await notify(profileId, "account_validated", "Ton compte a été validé ! Tu as maintenant accès à toutes les fonctionnalités.", "/dashboard");

  revalidatePath("/admin/comptes");
}

// Lets an admin create a parent or teacher account directly, with no
// pre-existing pending registration or CSV-imported `teachers` row needed —
// unlike /admin/profs, which only creates a *login* for a teacher who
// already exists in the `teachers` table.
export async function createAccount(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const validated = createAccountSchema.safeParse({
    role: formData.get("role"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    subject: formData.get("subject"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { message: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: existingPhone } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", validated.data.phone)
    .maybeSingle();
  if (existingPhone) {
    return { message: `Le numéro ${validated.data.phone} est déjà utilisé par un compte.` };
  }

  const email = `doc.${randomBytes(4).toString("hex")}@cpk.internal`;
  const { data: created, error } = await adminClient.auth.admin.createUser({
    email,
    password: validated.data.password,
    email_confirm: true,
  });
  if (error || !created.user) {
    return { message: error?.message ?? "Échec de la création du compte." };
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: created.user.id,
    role: validated.data.role,
    status: "validated",
    full_name: validated.data.fullName,
    phone: validated.data.phone,
  });
  if (profileError) {
    return { message: profileError.message };
  }

  if (validated.data.role === "teacher") {
    const [firstName, ...rest] = validated.data.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    const { error: teacherError } = await adminClient.from("teachers").insert({
      first_name: firstName,
      last_name: lastName,
      subject: validated.data.subject || null,
      phone: validated.data.phone,
      user_id: created.user.id,
    });
    if (teacherError) {
      return { message: teacherError.message };
    }
  }

  revalidatePath("/admin/comptes");
  revalidatePath("/admin/profs");
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/emploi-du-temps");
  return {
    success: `Compte créé — identifiant : ${validated.data.phone}, mot de passe : ${validated.data.password}`,
  };
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
    teacherId: formData.get("teacherId"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("timetable_entries").insert({
    class_id: validated.data.classId,
    class_name: validated.data.className,
    day_of_week: validated.data.dayOfWeek,
    start_time: validated.data.startTime,
    end_time: validated.data.endTime,
    subject: validated.data.subject,
    teacher_id: validated.data.teacherId,
  });

  if (error) return { message: error.message };

  revalidatePath("/admin/emploi-du-temps");
  return { success: "Créneau ajouté." };
}

export async function deleteTimetableEntry(entryId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
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

async function applyTeacherAbsence({
  teacherId,
  startsAt,
  endsAt,
  reason,
  createdBy,
}: {
  teacherId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | undefined;
  createdBy: string;
}): Promise<FormState> {
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
    created_by: createdBy,
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

    const parentIds = Array.from(new Set((students ?? []).map((s) => s.parent_id).filter(Boolean))) as string[];
    if (parentIds.length > 0) {
      const { data: parents } = await supabase.from("profiles").select("id, phone").in("id", parentIds);

      for (const parent of parents ?? []) {
        if (parent.phone) await sendSms(parent.phone, message, "teacher_absence");
      }

      await notifyMany(parentIds, "teacher_absence", message, "/emploi-du-temps");
    }
  }

  const t = await getTranslations("homework");
  revalidatePath("/admin/absences");
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/dashboard");
  return {
    success: t("absenceRecorded", {
      slots: affectedEntryIds.size,
      classes: affectedClasses.size,
    }),
  };
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

  return applyTeacherAbsence({
    teacherId: validated.data.teacherId,
    startsAt: new Date(validated.data.startsAt),
    endsAt: new Date(validated.data.endsAt),
    reason: validated.data.reason,
    createdBy: admin.id,
  });
}

/** Teacher self-service version of declareTeacherAbsence: no teacher picker, uses their own linked teacher row. */
export async function declareOwnAbsence(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return { message: "Non autorisé." };
  }

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!teacher) {
    return { message: "Aucune fiche professeur liée à ce compte." };
  }

  const validated = teacherAbsenceSchema.safeParse({
    teacherId: teacher.id,
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason") ?? undefined,
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  return applyTeacherAbsence({
    teacherId: teacher.id,
    startsAt: new Date(validated.data.startsAt),
    endsAt: new Date(validated.data.endsAt),
    reason: validated.data.reason,
    createdBy: profile.id,
  });
}

// ---------------------------------------------------------------------------
// Comptes profs — création 1-clic depuis le panel admin
// ---------------------------------------------------------------------------

export async function createTeacherAccount(
  teacherId: string,
): Promise<{ success: true; email: string; password: string } | { success: false; error: string }> {
  await requireAdmin();

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: teacher } = await adminClient
    .from("teachers")
    .select("id, first_name, last_name, phone, user_id")
    .eq("id", teacherId)
    .single();

  if (!teacher) return { success: false, error: "Professeur introuvable." };
  if (teacher.user_id) return { success: false, error: "Ce compte existe déjà." };

  const password = generatePassword();
  const identifier = teacher.phone || randomBytes(4).toString("hex");
  const email = `${identifier}@cpk.internal`;

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
    role: "teacher",
    status: "validated",
    phone: teacher.phone,
    full_name: `${teacher.first_name} ${teacher.last_name}`,
  });
  await adminClient.from("teachers").update({ user_id: created.user.id }).eq("id", teacherId);

  revalidatePath("/admin/profs");
  return { success: true, email, password };
}

export async function updateTeacherClasses(teacherId: string, classIds: string[]) {
  await requireAdmin();
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("teacher_classes")
    .delete()
    .eq("teacher_id", teacherId);
  if (deleteError) throw new Error(deleteError.message);

  if (classIds.length > 0) {
    const { error } = await supabase
      .from("teacher_classes")
      .insert(classIds.map((classId) => ({ teacher_id: teacherId, class_id: classId })));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/profs");
}

// ---------------------------------------------------------------------------
// Cahier de texte numérique — devoirs par classe/matière
// ---------------------------------------------------------------------------

export async function createHomework(_state: FormState, formData: FormData): Promise<FormState> {
  const t = await getTranslations("homework");
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    return { message: "Non autorisé." };
  }

  const validated = homeworkSchema.safeParse({
    classId: formData.get("classId") ?? "",
    className: formData.get("className"),
    subject: formData.get("subject"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("homework").insert({
    class_id: validated.data.classId || null,
    class_name: validated.data.className,
    subject: validated.data.subject,
    description: validated.data.description,
    due_date: validated.data.dueDate,
    priority: validated.data.priority,
    created_by: profile.id,
  });

  if (error) return { message: error.message };

  const { data: students } = await supabase
    .from("students")
    .select("user_id")
    .or(
      validated.data.classId
        ? `class_id.eq.${validated.data.classId},class_name.eq.${validated.data.className}`
        : `class_name.eq.${validated.data.className}`,
    )
    .not("user_id", "is", null);

  const studentIds = (students ?? []).map((s) => s.user_id).filter(Boolean) as string[];
  if (studentIds.length > 0) {
    await notifyMany(
      studentIds,
      "homework",
      `Nouveau devoir de ${validated.data.subject} pour le ${new Date(validated.data.dueDate).toLocaleDateString("fr-FR")}.`,
      "/dashboard",
    );
  }

  revalidatePath("/dashboard");
  return { success: t("added") };
}

// Teacher-only — a one-off "rattrapage" session for one of their own
// classes, shown on /emploi-du-temps alongside the recurring weekly grid.
export async function createMakeupSession(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return { message: "Non autorisé." };
  }

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!teacher) {
    return { message: "Aucune fiche professeur liée à ce compte." };
  }

  const validated = makeupSessionSchema.safeParse({
    classId: formData.get("classId"),
    className: formData.get("className"),
    subject: formData.get("subject"),
    sessionDate: formData.get("sessionDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { error } = await supabase.from("makeup_sessions").insert({
    class_id: validated.data.classId,
    class_name: validated.data.className,
    teacher_id: teacher.id,
    subject: validated.data.subject,
    session_date: validated.data.sessionDate,
    start_time: validated.data.startTime,
    end_time: validated.data.endTime,
    reason: validated.data.reason || null,
    created_by: profile.id,
  });
  if (error) return { message: error.message };

  const { data: students } = await supabase
    .from("students")
    .select("user_id")
    .eq("class_id", validated.data.classId)
    .not("user_id", "is", null);

  const studentIds = (students ?? []).map((s) => s.user_id).filter(Boolean) as string[];
  if (studentIds.length > 0) {
    await notifyMany(
      studentIds,
      "makeup_session",
      `Séance de rattrapage ajoutée : ${validated.data.subject} le ${new Date(validated.data.sessionDate).toLocaleDateString("fr-FR")}.`,
      "/emploi-du-temps",
    );
  }

  revalidatePath("/emploi-du-temps");
  return { success: "Séance de rattrapage ajoutée." };
}

export async function deleteMakeupSession(sessionId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const supabase = await createClient();
  const { error } = await supabase.from("makeup_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);

  revalidatePath("/emploi-du-temps");
}

export async function toggleHomeworkCompletion(homeworkId: string, completed: boolean) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Non connecté.");

  const supabase = await createClient();

  if (completed) {
    await supabase
      .from("homework_completions")
      .insert({ homework_id: homeworkId, student_id: profile.id });
    await checkToujoursAJour(profile.id);
  } else {
    await supabase
      .from("homework_completions")
      .delete()
      .eq("homework_id", homeworkId)
      .eq("student_id", profile.id);
  }

  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Devoirs (contrôle / synthèse) — calendrier d'examens par classe
// ---------------------------------------------------------------------------

export async function createExam(_state: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    return { message: "Non autorisé." };
  }

  const validated = examSchema.safeParse({
    classId: formData.get("classId") ?? "",
    className: formData.get("className"),
    subject: formData.get("subject"),
    type: formData.get("type"),
    examDate: formData.get("examDate"),
    description: formData.get("description") ?? "",
    teacherNotes: formData.get("teacherNotes") ?? "",
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("exams").insert({
    class_id: validated.data.classId || null,
    class_name: validated.data.className,
    subject: validated.data.subject,
    type: validated.data.type,
    exam_date: validated.data.examDate,
    description: validated.data.description || null,
    teacher_notes: validated.data.teacherNotes || null,
    created_by: profile.id,
  });

  if (error) return { message: error.message };

  const { data: students } = await supabase
    .from("students")
    .select("user_id")
    .or(
      validated.data.classId
        ? `class_id.eq.${validated.data.classId},class_name.eq.${validated.data.className}`
        : `class_name.eq.${validated.data.className}`,
    )
    .not("user_id", "is", null);

  const studentIds = (students ?? []).map((s) => s.user_id).filter(Boolean) as string[];
  if (studentIds.length > 0) {
    const typeLabel = validated.data.type === "synthese" ? "de synthèse" : "de contrôle";
    await notifyMany(
      studentIds,
      "exam",
      `Nouveau devoir ${typeLabel} de ${validated.data.subject} le ${new Date(validated.data.examDate).toLocaleDateString("fr-FR")}.`,
      "/devoirs",
    );
  }

  revalidatePath("/devoirs");
  revalidatePath("/dashboard");
  return { success: "Devoir ajouté au calendrier." };
}

// ---------------------------------------------------------------------------
// Compte enfant — création 1-clic depuis l'espace parent
// ---------------------------------------------------------------------------

function generatePassword() {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

export async function createChildAccount(
  studentId: string,
  password: string,
): Promise<{ success: true; email: string; password: string } | { success: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "parent") {
    return { success: false, error: "Non autorisé." };
  }
  if (password.length < 6) {
    return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
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

export async function resetChildPassword(
  studentId: string,
  password: string,
): Promise<{ success: true; email: string; password: string } | { success: false; error: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "parent") {
    return { success: false, error: "Non autorisé." };
  }
  if (password.length < 6) {
    return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, parent_id, user_id")
    .eq("id", studentId)
    .single();

  if (!student || student.parent_id !== profile.id) {
    return { success: false, error: "Élève introuvable." };
  }
  if (!student.user_id) {
    return { success: false, error: "Ce compte n'existe pas encore." };
  }

  const { error } = await adminClient.auth.admin.updateUserById(student.user_id, { password });
  if (error) return { success: false, error: error.message };

  const { data: userData } = await adminClient.auth.admin.getUserById(student.user_id);
  const email = userData.user?.email ?? "";

  const {
    data: { user: parentUser },
  } = await supabase.auth.getUser();
  if (parentUser?.email && !parentUser.email.endsWith("@cpk.internal")) {
    await sendEmail(
      parentUser.email,
      "Mot de passe réinitialisé — CPK Learn",
      `<p>Nouveaux identifiants de connexion :</p><p>Email : ${email}<br/>Mot de passe : ${password}</p>`,
    );
  }

  return { success: true, email, password };
}

// ---------------------------------------------------------------------------
// Comptes "document" — créés en lot par l'admin, imprimés en fiches (PDF)
// avec QR code, à distribuer aux parents (Bloc "fiche de renseignement").
// ---------------------------------------------------------------------------

export async function createDocumentAccounts(
  entries: {
    fullName: string;
    cin: string;
    phone: string;
    childFirstName: string;
    childClass: string;
  }[],
): Promise<{ success: true; pdfBase64: string } | { success: false; error: string }> {
  await requireAdmin();

  if (entries.length === 0) {
    return { success: false, error: "Ajoute au moins une personne." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const validatedEntries = [];
  for (const entry of entries) {
    const validated = documentAccountSchema.safeParse(entry);
    if (!validated.success) {
      return {
        success: false,
        error: `${entry.fullName || "(sans nom)"} : ${validated.error.issues[0]?.message ?? "Donnée invalide."}`,
      };
    }
    validatedEntries.push(validated.data);
  }

  const documentEntries: DocumentEntry[] = [];

  for (const entry of validatedEntries) {
    const { data: existingPhone } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone", entry.phone)
      .maybeSingle();
    if (existingPhone) {
      return { success: false, error: `Le numéro ${entry.phone} est déjà utilisé par un compte.` };
    }

    const { data: existingCin } = await adminClient
      .from("profiles")
      .select("id")
      .eq("cin", entry.cin)
      .maybeSingle();
    if (existingCin) {
      return { success: false, error: `La CIN ${entry.cin} est déjà utilisée par un compte.` };
    }

    const password = generatePassword();
    const qrToken = randomBytes(24).toString("hex");
    const email = `doc.${randomBytes(4).toString("hex")}@cpk.internal`;

    const { data: created, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !created.user) {
      return { success: false, error: error?.message ?? "Échec de la création du compte." };
    }

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      role: "parent",
      status: "validated",
      full_name: entry.fullName,
      cin: entry.cin,
      phone: entry.phone,
      qr_login_token: qrToken,
      must_change_password: true,
    });
    if (profileError) {
      return { success: false, error: profileError.message };
    }

    const { data: classRow } = await adminClient
      .from("classes")
      .select("id")
      .eq("name", entry.childClass)
      .maybeSingle();

    const { error: studentError } = await adminClient.from("students").insert({
      parent_id: created.user.id,
      first_name: entry.childFirstName,
      class_name: entry.childClass,
      class_id: classRow?.id ?? null,
    });
    if (studentError) {
      return { success: false, error: studentError.message };
    }

    documentEntries.push({
      fullName: entry.fullName,
      cin: entry.cin,
      childFirstName: entry.childFirstName,
      phone: entry.phone,
      password,
      qrUrl: qrLoginUrl(qrToken),
    });
  }

  const pdfBytes = await buildDocumentsPdf(documentEntries);
  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

  revalidatePath("/admin/documents");
  revalidatePath("/admin/utilisateurs");
  return { success: true, pdfBase64 };
}

// ---------------------------------------------------------------------------
// Utilisateurs — vue d'ensemble + édition directe depuis le panel admin
// ---------------------------------------------------------------------------

export async function updateUserProfile(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const validated = userUpdateSchema.safeParse({
    profileId: formData.get("profileId"),
    role: formData.get("role"),
    status: formData.get("status"),
    phone: formData.get("phone") ?? "",
    tags: formData.get("tags") ?? "",
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const supabase = await createClient();
  const tags = validated.data.tags
    ? validated.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const { error } = await supabase
    .from("profiles")
    .update({
      role: validated.data.role,
      status: validated.data.status,
      phone: validated.data.phone || null,
      tags,
    })
    .eq("id", validated.data.profileId);

  if (error) return { message: error.message };

  // A profile switched to "teacher" here (as opposed to via the normal
  // /admin/profs flow, which always creates the teachers row first) has
  // nothing in the teachers table yet — and that table is what
  // /admin/profs, class assignment, and the dashboard's homework/exam
  // forms are all keyed on. Without this, a teacher account created purely
  // by changing a profile's role would never be assignable to a class.
  if (validated.data.role === "teacher") {
    const { data: existingTeacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", validated.data.profileId)
      .maybeSingle();

    if (!existingTeacher) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, parent_first_name, parent_last_name")
        .eq("id", validated.data.profileId)
        .single();

      const displayName =
        profileRow?.full_name ?? profileRow?.parent_first_name ?? "Professeur";
      const [firstName, ...rest] = displayName.trim().split(/\s+/);
      const lastName = rest.join(" ") || profileRow?.parent_last_name || firstName;

      await supabase.from("teachers").insert({
        first_name: firstName,
        last_name: lastName,
        phone: validated.data.phone || null,
        user_id: validated.data.profileId,
      });
    }
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/profs");
  return { success: "Profil mis à jour." };
}

export async function deleteUserProfile(profileId: string): Promise<{ error?: string }> {
  const profile = await requireAdmin();
  if (profile.id === profileId) {
    return { error: "Impossible de supprimer ton propre compte." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { error: "Supabase (clé service_role) n'est pas configuré." };
  }

  // Deletes the auth.users row, which cascades to `profiles` (and from
  // there to students/feed_posts/etc. per their own FK rules) — this is a
  // full account removal, not just hiding the profile.
  const { error } = await adminClient.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  return {};
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function createClass(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const validated = classNameSchema.safeParse({ name: formData.get("name") });
  if (!validated.success) return { message: validated.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("classes").insert({ name: validated.data.name });
  if (error) return { message: error.message };

  revalidatePath("/admin/classes");
  revalidatePath("/admin/emploi-du-temps");
  return { success: "Classe ajoutée." };
}

export async function renameClass(classId: string, name: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("classes").update({ name }).eq("id", classId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/classes");
}

export async function deleteClass(classId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/classes");
}

// ---------------------------------------------------------------------------
// Staff — annuaire public avec choix de photo
// ---------------------------------------------------------------------------

export async function upsertStaffMember(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const validated = staffMemberSchema.safeParse({
    fullName: formData.get("fullName"),
    roleTitle: formData.get("roleTitle"),
    showPhoto: formData.get("showPhoto") === "on",
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) return { message: "Supabase (clé service_role) n'est pas configuré." };

  let photoUrl: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const path = `staff/${randomBytes(6).toString("hex")}-${photo.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error: uploadError } = await adminClient.storage
      .from("staff-photos")
      .upload(path, photo, { contentType: photo.type, upsert: true });
    if (uploadError) return { message: uploadError.message };
    photoUrl = adminClient.storage.from("staff-photos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await adminClient.from("staff_members").insert({
    full_name: validated.data.fullName,
    role_title: validated.data.roleTitle,
    show_photo: validated.data.showPhoto,
    photo_url: photoUrl,
  });

  if (error) return { message: error.message };

  revalidatePath("/admin/staff");
  revalidatePath("/staff");
  return { success: "Membre du staff ajouté." };
}

export async function deleteStaffMember(staffId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("staff_members").delete().eq("id", staffId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
  revalidatePath("/staff");
}

// ---------------------------------------------------------------------------
// Aide — formulaire public + file d'attente admin
// ---------------------------------------------------------------------------

export async function submitHelpRequest(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { message: "Connecte-toi d'abord pour envoyer une demande d'aide." };
  }

  const validated = helpRequestSchema.safeParse({
    subject: formData.get("subject"),
    description: formData.get("description"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("help_requests").insert({
    author_id: profile.id,
    subject: validated.data.subject,
    description: validated.data.description,
  });

  if (error) return { message: error.message };
  return { success: "Ta demande a bien été envoyée." };
}

export async function updateHelpRequestStatus(requestId: string, status: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("help_requests").update({ status }).eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/aide");
}

// ---------------------------------------------------------------------------
// Boîte à idées — propositions des parents/élèves, validées par l'admin
// ---------------------------------------------------------------------------

export async function validateSuggestion(suggestionId: string, title: string) {
  await requireAdmin();

  if (!title.trim()) throw new Error("Un titre est requis.");

  const supabase = await createClient();
  const { data: suggestion, error } = await supabase
    .from("suggestions")
    .update({ title: title.trim(), status: "validated", validated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .select("author_id")
    .single();

  if (error) throw new Error(error.message);

  if (suggestion?.author_id) {
    await notify(
      suggestion.author_id,
      "suggestion_validated",
      `Ta proposition « ${title.trim()} » a été validée !`,
      `/idees/${suggestionId}`,
    );
  }

  revalidatePath("/admin/idees");
  revalidatePath("/idees");
}

export async function rejectSuggestion(suggestionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("suggestions")
    .update({ status: "rejected" })
    .eq("id", suggestionId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/idees");
}

// ---------------------------------------------------------------------------
// Nouveautés — changelog publiable par l'admin
// ---------------------------------------------------------------------------

export async function publishRelease(_state: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const validated = releaseSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("releases").insert({
    title: validated.data.title,
    body: validated.data.body,
    published_by: admin.id,
  });

  if (error) return { message: error.message };

  revalidatePath("/admin/nouveautes");
  revalidatePath("/nouveautes");
  return { success: "Publié." };
}

// ---------------------------------------------------------------------------
// site_settings — réglages génériques (ex : lien externe "Plus de nous").
// ---------------------------------------------------------------------------

export async function updateSiteSetting(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const key = formData.get("key");
  const value = formData.get("value");
  if (typeof key !== "string" || !key.trim()) return { message: "Clé manquante." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: key.trim(), value: typeof value === "string" ? value.trim() : "" });

  if (error) return { message: error.message };

  revalidatePath("/admin/parametres");
  revalidatePath("/a-propos");
  return { success: "Enregistré." };
}
