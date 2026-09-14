"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireSchoolStaff } from "@/lib/admin/guard";
import { canUseAdminArea } from "@/lib/auth/roles";
import { hasPassedAdminVerification } from "@/lib/admin/adminVerification";
import { SITE_URL } from "@/lib/siteUrl";
import { sendSms } from "@/lib/smsService";
import { sendEmail } from "@/lib/emailService";
import { renderEmail, plainTextToHtml } from "@/lib/emailTemplate";
import { getSiteSetting } from "@/lib/admin/data";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  formatSchoolDateTime,
  isoWeekdayOf,
  parseSchoolDateTime,
  schoolCalendarDay,
  slotInstant,
} from "@/lib/schoolTime";
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

/**
 * Points a profile at its `teachers` record, adopting the one the timetable
 * already uses instead of adding a second row for the same person. Two rows
 * for one teacher silently break everything keyed on teacher_id: an absence
 * declared from the account matched none of their courses, because the
 * courses hung off the other row. Returns an error message, or null.
 */
async function linkOrCreateTeacherRow({
  profileId,
  fullName,
  fallbackLastName,
  phone,
  subject,
}: {
  profileId: string;
  fullName: string;
  fallbackLastName?: string | null;
  phone?: string | null;
  subject?: string | null;
}): Promise<string | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return "Supabase (clé service_role) n'est pas configuré.";

  const { data: alreadyLinked } = await adminClient
    .from("teachers")
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();
  if (alreadyLinked) return null;

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || fallbackLastName || firstName;

  // Only an unclaimed record is adopted, and only when exactly one matches —
  // two teachers sharing a name are left alone rather than risking the wrong
  // person being linked.
  const { data: unclaimed } = await adminClient
    .from("teachers")
    .select("id")
    .is("user_id", null)
    .ilike("first_name", firstName)
    .ilike("last_name", lastName);

  if (unclaimed?.length === 1) {
    // Only fill blanks — never overwrite what the existing record already has.
    const patch: { user_id: string; phone?: string; subject?: string } = { user_id: profileId };
    if (phone) patch.phone = phone;
    if (subject) patch.subject = subject;

    const { error } = await adminClient.from("teachers").update(patch).eq("id", unclaimed[0].id);
    return error?.message ?? null;
  }

  const { error } = await adminClient.from("teachers").insert({
    first_name: firstName,
    last_name: lastName,
    subject: subject || null,
    phone: phone || null,
    user_id: profileId,
  });
  return error?.message ?? null;
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
    const teacherError = await linkOrCreateTeacherRow({
      profileId: created.user.id,
      fullName: validated.data.fullName,
      phone: validated.data.phone,
      subject: validated.data.subject,
    });
    if (teacherError) {
      return { message: teacherError };
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
  await requireSchoolStaff();

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
  await requireSchoolStaff();

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
  await requireSchoolStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("timetable_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
}

// ---------------------------------------------------------------------------
// Absences — déclaration + propagation automatique + alerte SMS
// ---------------------------------------------------------------------------

/** How many sends run at once: fast enough for a whole grade, gentle on the gateway phone. */
const FANOUT_CONCURRENCY = 5;

async function inBatches<T>(items: T[], worker: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += FANOUT_CONCURRENCY) {
    await Promise.all(
      items.slice(i, i + FANOUT_CONCURRENCY).map((item) => worker(item).catch(() => undefined)),
    );
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Default ON — only an explicit "false" written from /admin/parametres turns absence emails off. */
async function isAbsenceEmailEnabled() {
  return (await getSiteSetting("absence_email_enabled")) !== "false";
}

type AbsenceRecipient = { id: string; phone: string | null; contact_email: string | null };

/** Last 8 digits: "52 254 129", "+216 52254129" and "21652254129" are one phone. */
function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-8);
}

async function emailAbsenceAlert(
  recipients: AbsenceRecipient[],
  subject: string,
  message: string,
  sentBy: string,
) {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  const html = renderEmail({ title: subject, bodyHtml: plainTextToHtml(message) });

  const addresses = new Set<string>();
  await inBatches(recipients, async (recipient) => {
    // A declared contact_email wins; otherwise the auth address, which is
    // only a real inbox for email signups — phone signups carry a synthetic
    // @cpk.internal address that goes nowhere.
    if (recipient.contact_email && EMAIL_RE.test(recipient.contact_email.trim())) {
      addresses.add(recipient.contact_email.trim().toLowerCase());
      return;
    }
    const { data: userData } = await adminClient.auth.admin.getUserById(recipient.id);
    const authEmail = userData.user?.email ?? "";
    if (authEmail && !authEmail.endsWith("@cpk.internal") && EMAIL_RE.test(authEmail)) {
      addresses.add(authEmail.toLowerCase());
    }
  });

  // A parent and the child account they created often share one inbox: one email, not two.
  await inBatches(Array.from(addresses), (email) =>
    sendEmail(email, subject, html, { sentBy, logBody: message }),
  );
}

/**
 * Which recurring slots of `teacherId` an absence window hits, and who must
 * hear about it: the parents AND the students (whichever have an account) of
 * every affected class. Reads with the service-role client because a
 * teacher's own session can't see other families' rows under RLS.
 */
async function findAbsenceImpact(teacherId: string, startsAt: Date, endsAt: Date) {
  const supabase = await createClient();
  const db = createAdminClient() ?? supabase;

  const { data: candidateEntries } = await db
    .from("timetable_entries")
    .select("id, class_id, class_name, day_of_week, start_time, end_time")
    .eq("teacher_id", teacherId);

  // Walk calendar days as they are in Tunis, not in the server's zone (UTC on
  // Vercel), and place each "HH:MM" slot at Tunisian time.
  const days: Date[] = [];
  const cursor = schoolCalendarDay(startsAt);
  const last = schoolCalendarDay(endsAt);
  // Safety cap matches the 90-day zod validation on the absence window.
  for (let i = 0; cursor <= last && i < 120; i++) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const affectedEntryIds = new Set<string>();
  const classIds = new Set<string>();
  const classNames = new Set<string>();

  for (const entry of candidateEntries ?? []) {
    for (const day of days) {
      if (isoWeekdayOf(day) !== entry.day_of_week) continue;
      if (slotInstant(day, entry.start_time) < endsAt && slotInstant(day, entry.end_time) > startsAt) {
        affectedEntryIds.add(entry.id);
        if (entry.class_id) classIds.add(entry.class_id);
        classNames.add(entry.class_name);
        break;
      }
    }
  }

  let recipients: AbsenceRecipient[] = [];
  if (affectedEntryIds.size > 0) {
    // Match on class_id OR class_name: a student registered under a class
    // name that had no classes row yet carries a null class_id.
    const [byId, byName] = await Promise.all([
      classIds.size > 0
        ? db.from("students").select("parent_id, user_id").in("class_id", Array.from(classIds))
        : Promise.resolve({ data: [] as { parent_id: string | null; user_id: string | null }[] }),
      db.from("students").select("parent_id, user_id").in("class_name", Array.from(classNames)),
    ]);
    const students = [...(byId.data ?? []), ...(byName.data ?? [])];

    // user_id is only set once the student has their own account — a Set
    // both dedupes siblings sharing one parent and drops the nulls.
    const recipientIds = Array.from(
      new Set(students.flatMap((s) => [s.parent_id, s.user_id]).filter(Boolean)),
    ) as string[];

    if (recipientIds.length > 0) {
      const { data } = await db
        .from("profiles")
        .select("id, phone, contact_email")
        .in("id", recipientIds);
      recipients = data ?? [];
    }
  }

  return { affectedEntryIds, classCount: classNames.size, recipients };
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
  const db = createAdminClient() ?? supabase;

  if (endsAt.getTime() <= Date.now()) {
    return { message: "Cette absence est déjà terminée : il n'y a rien à annoncer aux familles." };
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("first_name, last_name")
    .eq("id", teacherId)
    .single();

  // A double click, or the same absence declared from the teacher's dashboard
  // and from the admin panel, would otherwise text every family twice.
  const { data: overlapping } = await db
    .from("teacher_absences")
    .select("starts_at, ends_at")
    .eq("teacher_id", teacherId)
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString())
    .limit(1);
  if (overlapping && overlapping.length > 0) {
    return {
      message: `Une absence est déjà déclarée pour ce professeur sur cette période (${formatSchoolDateTime(overlapping[0].starts_at)} → ${formatSchoolDateTime(overlapping[0].ends_at)}). Supprime-la d'abord pour la modifier.`,
    };
  }

  const { error: absenceError } = await supabase.from("teacher_absences").insert({
    teacher_id: teacherId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: reason || null,
    created_by: createdBy,
  });
  if (absenceError) return { message: absenceError.message };

  // The cancelled state of each slot is derived at read time from this row
  // (see listTimetableEntries() in data.ts), never written on the recurring
  // timetable_entries rows — that struck the course out every week forever.
  const { affectedEntryIds, classCount, recipients } = await findAbsenceImpact(
    teacherId,
    startsAt,
    endsAt,
  );

  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : "Un professeur";
  const when = (d: Date) =>
    formatSchoolDateTime(d, "fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const verb = startsAt.getTime() > Date.now() ? "sera absent(e)" : "est absent(e)";
  // Kept inside the GSM-7 alphabet (no "ê", no curly quotes): one character
  // outside it switches the SMS to UCS-2 and triples its cost.
  const message = `CPK Learn : ${teacherName} ${verb} du ${when(startsAt)} au ${when(endsAt)}. Les cours concernes sont annules, consultez l'emploi du temps.`;

  if (recipients.length > 0) {
    const recipientIds = recipients.map((r) => r.id);
    // A parent and their child's account usually share one phone: one SMS per number.
    const phones = new Map<string, string>();
    for (const recipient of recipients) {
      if (recipient.phone && phoneKey(recipient.phone).length === 8) {
        phones.set(phoneKey(recipient.phone), recipient.phone);
      }
    }
    const sendEmails = await isAbsenceEmailEnabled();

    // Alerting a whole grade one SMS at a time took longer than a server
    // action may run: the form hung and the last families were never
    // reached. Answer now and keep sending after the response.
    after(async () => {
      await notifyMany(recipientIds, "teacher_absence", message, "/emploi-du-temps");
      await inBatches(Array.from(phones.values()), (phone) =>
        sendSms(phone, message, "teacher_absence"),
      );
      if (sendEmails) {
        await emailAbsenceAlert(recipients, `Absence de ${teacherName}`, message, createdBy);
      }
    });
  }

  const t = await getTranslations("homework");
  revalidatePath("/admin/absences");
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
  revalidatePath("/dashboard");
  return {
    success: t("absenceRecorded", {
      slots: affectedEntryIds.size,
      classes: classCount,
      people: recipients.length,
    }),
  };
}

export async function deleteTeacherAbsence(absenceId: string) {
  await requireSchoolStaff();
  const supabase = await createClient();

  const { data: absence } = await supabase
    .from("teacher_absences")
    .select("teacher_id, starts_at, ends_at, teachers(first_name, last_name)")
    .eq("id", absenceId)
    .maybeSingle();

  const { error } = await supabase.from("teacher_absences").delete().eq("id", absenceId);
  if (error) throw new Error(error.message);

  // Families were told the courses are off. If the absence isn't over yet,
  // tell them they're back on — in the app and by push only, so fixing a
  // typo (delete, then declare again) doesn't cost an extra round of SMS.
  if (absence && new Date(absence.ends_at).getTime() > Date.now()) {
    const startsAt = new Date(absence.starts_at);
    const endsAt = new Date(absence.ends_at);
    const { recipients } = await findAbsenceImpact(absence.teacher_id, startsAt, endsAt);
    if (recipients.length > 0) {
      const teacher = Array.isArray(absence.teachers) ? absence.teachers[0] : absence.teachers;
      const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : "du professeur";
      const message = `Absence annulée : ${teacherName} sera bien présent(e) du ${formatSchoolDateTime(startsAt)} au ${formatSchoolDateTime(endsAt)}. Les cours ont lieu normalement.`;
      const recipientIds = recipients.map((r) => r.id);
      after(() => notifyMany(recipientIds, "teacher_absence", message, "/emploi-du-temps"));
    }
  }

  // Nothing else to undo: the strike-through on the timetable is derived from
  // this row, so deleting it restores the affected courses on its own.
  revalidatePath("/admin/absences");
  revalidatePath("/admin/emploi-du-temps");
  revalidatePath("/emploi-du-temps");
  revalidatePath("/dashboard");
}

export async function declareTeacherAbsence(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireSchoolStaff();

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
    startsAt: parseSchoolDateTime(validated.data.startsAt),
    endsAt: parseSchoolDateTime(validated.data.endsAt),
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
    startsAt: parseSchoolDateTime(validated.data.startsAt),
    endsAt: parseSchoolDateTime(validated.data.endsAt),
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
  if (!profile || (profile.role !== "teacher" && !canUseAdminArea(profile.role))) {
    return { message: "Non autorisé." };
  }
  // From the admin area (admin, director, staff), the SMS verification applies too.
  if (canUseAdminArea(profile.role) && !(await hasPassedAdminVerification())) {
    return { message: "Vérification par SMS requise." };
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

  const { data: students } = await (createAdminClient() ?? supabase)
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
  revalidatePath("/admin/devoirs");
  return { success: t("added") };
}

export async function deleteHomework(homeworkId: string) {
  await requireSchoolStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("homework").delete().eq("id", homeworkId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/devoirs");
  revalidatePath("/dashboard");
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
  if (!profile || (profile.role !== "teacher" && !canUseAdminArea(profile.role))) {
    return { message: "Non autorisé." };
  }
  // From the admin area (admin, director, staff), the SMS verification applies too.
  if (canUseAdminArea(profile.role) && !(await hasPassedAdminVerification())) {
    return { message: "Vérification par SMS requise." };
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

  const { data: students } = await (createAdminClient() ?? supabase)
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
  revalidatePath("/admin/devoirs");
  return { success: "Devoir ajouté au calendrier." };
}

export async function deleteExam(examId: string) {
  await requireSchoolStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/devoirs");
  revalidatePath("/devoirs");
}

// ---------------------------------------------------------------------------
// Compte enfant — création 1-clic depuis l'espace parent
// ---------------------------------------------------------------------------

function generatePassword() {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

/**
 * Issues a single-use login QR for an account and invalidates any earlier one,
 * so only the most recent code handed out can ever work. Shared by the admin
 * "generate a QR" button and by child account creation.
 */
async function issueLoginQrToken(
  profileId: string,
  createdBy: string | null,
): Promise<{ url: string; qrDataUrl: string; expiresAt: string } | { error: string }> {
  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Supabase (clé service_role) n'est pas configuré." };

  await adminClient
    .from("login_qr_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", profileId)
    .is("used_at", null);

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: row, error } = await adminClient
    .from("login_qr_tokens")
    .insert({ user_id: profileId, token_hash: tokenHash, created_by: createdBy })
    .select("expires_at")
    .single();
  if (error || !row) return { error: error?.message ?? "Échec de la génération du code." };

  const url = `${SITE_URL}/api/qr-connexion/${token}`;
  return {
    url,
    qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 400 }),
    expiresAt: row.expires_at,
  };
}

export type ChildAccountResult =
  | { success: true; url: string; qrDataUrl: string; expiresAt: string; sentBySms: boolean; sentByEmail: boolean }
  | { success: false; error: string };

/**
 * Creates the child's account and hands it over as a single-use login QR
 * instead of a password: nobody has to read out or retype credentials, and the
 * child sets their own password right after scanning (must_change_password).
 * The account's initial password is random and deliberately never shown.
 */
export async function createChildAccount(studentId: string): Promise<ChildAccountResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "parent") {
    return { success: false, error: "Non autorisé." };
  }

  const password = generatePassword();
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
    must_change_password: true,
  });
  await adminClient.from("students").update({ user_id: created.user.id }).eq("id", studentId);

  const issued = await issueLoginQrToken(created.user.id, profile.id);
  if ("error" in issued) return { success: false, error: issued.error };

  const childName = student.first_name;

  const sms = profile.phone
    ? await sendSms(
        profile.phone,
        `CPK Learn : le compte de ${childName} est créé. Lien de connexion (valable 14 jours, une seule utilisation) : ${issued.url}`,
        "generated_password",
      )
    : { success: false as const, error: "no phone" };

  // Only reachable if the parent has a real inbox: a phone signup carries a
  // synthetic @cpk.internal address that goes nowhere.
  const {
    data: { user: parentUser },
  } = await supabase.auth.getUser();
  const parentEmail =
    profile.contactEmail ??
    (parentUser?.email && !parentUser.email.endsWith("@cpk.internal") ? parentUser.email : null);

  let sentByEmail = false;
  if (parentEmail) {
    const body =
      `<p>Le compte de <b>${childName}</b> est créé.</p>` +
      `<p>Faites scanner ce code par ${childName} pour ouvrir sa session. ` +
      `Il choisira ensuite son propre mot de passe.</p>` +
      `<p><img src="cid:qrlogin" alt="Code QR de connexion" width="220" height="220" /></p>` +
      `<p>Si le code ne s'affiche pas, ce lien fait la même chose :<br/>` +
      `<a href="${issued.url}">${issued.url}</a></p>` +
      `<p>Valable 14 jours et utilisable une seule fois.</p>`;

    const result = await sendEmail(
      parentEmail,
      `Compte CPK Learn créé pour ${childName}`,
      renderEmail({ title: `Compte créé pour ${childName}`, bodyHtml: body }),
      {
        sentBy: profile.id,
        attachments: [
          {
            filename: "connexion-cpk.png",
            content: Buffer.from(issued.qrDataUrl.split(",")[1], "base64"),
            cid: "qrlogin",
          },
        ],
      },
    );
    sentByEmail = result.success;
  }

  revalidatePath("/dashboard");
  return { success: true, ...issued, sentBySms: sms.success, sentByEmail };
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
      { sentBy: profile.id },
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

// Generates a one-time login QR code for an existing user — the fastest,
// safest way to hand a parent or teacher their account: nobody ever has to
// read a password out loud. Scanning it logs the person in once and forces
// them to set their own password immediately (must_change_password); any QR
// generated earlier for the same user is invalidated in the same call, so
// only the most recent code handed out can ever work.
export async function generateLoginQrCode(
  profileId: string,
): Promise<
  | { success: true; url: string; qrDataUrl: string; expiresAt: string }
  | { success: false; error: string }
> {
  await requireAdmin();
  const admin = await getCurrentProfile();

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { success: false, error: "Supabase (clé service_role) n'est pas configuré." };
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return { success: false, error: "Utilisateur introuvable." };

  const issued = await issueLoginQrToken(profileId, admin?.id ?? null);
  if ("error" in issued) return { success: false, error: issued.error };

  return { success: true, ...issued };
}

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
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("full_name, parent_first_name, parent_last_name")
      .eq("id", validated.data.profileId)
      .single();

    await linkOrCreateTeacherRow({
      profileId: validated.data.profileId,
      fullName: profileRow?.full_name ?? profileRow?.parent_first_name ?? "Professeur",
      fallbackLastName: profileRow?.parent_last_name,
      phone: validated.data.phone,
    });
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
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom de la classe est vide.");
  const { error } = await supabase.from("classes").update({ name: trimmed }).eq("id", classId);
  if (error) throw new Error(error.message);

  // class_name is copied onto these rows. Left stale, a renamed class kept its
  // old name on the timetable and absence alerts, which also match students
  // by name, could stop reaching families registered under it.
  const db = createAdminClient() ?? supabase;
  await Promise.all(
    ["students", "timetable_entries", "homework", "exams"].map((table) =>
      db.from(table).update({ class_name: trimmed }).eq("class_id", classId),
    ),
  );

  revalidatePath("/admin/classes");
  revalidatePath("/emploi-du-temps");
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

export async function updateDownloadSettings(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const mode = formData.get("downloadMode");
  if (mode !== "apk" && mode !== "playstore") {
    return { message: "Mode invalide." };
  }
  const playstoreUrlRaw = formData.get("playstoreUrl");
  const playstoreUrl = typeof playstoreUrlRaw === "string" ? playstoreUrlRaw.trim() : "";

  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert([
    { key: "download_mode", value: mode },
    { key: "playstore_url", value: playstoreUrl },
  ]);
  if (error) return { message: error.message };

  revalidatePath("/admin/parametres");
  revalidatePath("/");
  return { success: "Enregistré." };
}

export async function updateSmsVerificationSetting(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const enabled = formData.get("enabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "sms_verification_enabled", value: enabled ? "true" : "false" });
  if (error) return { message: error.message };

  revalidatePath("/admin/parametres");
  return { success: "Enregistré." };
}

export async function updateAbsenceEmailSetting(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const enabled = formData.get("enabled") === "true";
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "absence_email_enabled", value: enabled ? "true" : "false" });
  if (error) return { message: error.message };

  revalidatePath("/admin/parametres");
  return { success: "Enregistré." };
}

export async function setReportStatus(reportId: string, status: "reviewed" | "dismissed") {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("user_reports").update({ status }).eq("id", reportId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/signalements");
}
