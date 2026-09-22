import { z } from "zod";
import { parseSchoolDateTime } from "@/lib/schoolTime";

export const timetableEntrySchema = z.object({
  classId: z.string().uuid(),
  className: z.string().trim().min(1),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format attendu HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format attendu HH:MM"),
  subject: z.string().trim().min(1),
  teacherId: z.string().uuid("Choisis un professeur."),
  room: z.string().trim().max(20).optional().or(z.literal("")),
  /** "all" for every week, or "A"/"B" for a fortnightly lesson. */
  weekParity: z.enum(["all", "A", "B"]).default("all"),
  /** Empty when the whole class has the lesson, otherwise a class_groups id. */
  classGroupId: z.string().uuid().optional().or(z.literal("")),
});

export const createAccountSchema = z.object({
  role: z.enum(["parent", "teacher"]),
  fullName: z.string().trim().min(1, "Nom requis."),
  phone: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Numéro invalide (8 chiffres)."),
  password: z.string().min(6, "6 caractères minimum."),
  subject: z.string().trim().optional().or(z.literal("")),
});

export const teacherAbsenceSchema = z
  .object({
    teacherId: z.string().uuid(),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    reason: z.string().trim().optional(),
  })
  .refine((data) => parseSchoolDateTime(data.endsAt) > parseSchoolDateTime(data.startsAt), {
    message: "La date de fin doit être après la date de début.",
    path: ["endsAt"],
  })
  .refine(
    (data) =>
      parseSchoolDateTime(data.endsAt).getTime() - parseSchoolDateTime(data.startsAt).getTime() <=
      90 * 24 * 60 * 60 * 1000,
    { message: "La période d'absence ne peut pas dépasser 90 jours.", path: ["endsAt"] },
  );

export const csvRowSchema = z.object({
  Jour: z.coerce.number().int().min(1).max(7),
  Heure_Début: z.string().regex(/^\d{2}:\d{2}$/),
  Heure_Fin: z.string().regex(/^\d{2}:\d{2}$/),
  Matière: z.string().trim().min(1),
  /** Facultatif : certains emplois du temps donnent la salle, pas le prof. */
  Professeur: z.string().trim().optional(),
  /** Salle du cours ("SP3", "INF1", "02"…). */
  Salle: z.string().trim().optional(),
  /** Cours à la quinzaine : "A", "B", ou vide pour toutes les semaines. */
  Semaine: z.string().trim().optional(),
  /** Cours par demi-groupe : le nom du groupe ("Groupe 1"), ou vide pour la classe entière. */
  Groupe: z.string().trim().optional(),
});

export const userUpdateSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["parent", "student", "teacher", "admin", "director", "staff"]),
  status: z.enum(["pending", "validated"]),
  phone: z.string().trim().optional().or(z.literal("")),
  tags: z.string().trim().optional().or(z.literal("")),
});

export const classNameSchema = z.object({
  name: z.string().trim().min(1, "Nom requis."),
});

export const staffMemberSchema = z.object({
  fullName: z.string().trim().min(1, "Nom requis."),
  roleTitle: z.string().trim().min(1, "Poste requis."),
  showPhoto: z.coerce.boolean(),
});

export const releaseSchema = z.object({
  title: z.string().trim().min(1, "Titre requis."),
  body: z.string().trim().min(1, "Contenu requis."),
});

export const helpRequestSchema = z.object({
  subject: z.string().trim().min(1, "Objet requis."),
  description: z.string().trim().min(1, "Description requise."),
});

export const makeupSessionSchema = z.object({
  classId: z.string().uuid(),
  className: z.string().trim().min(1, "Classe requise."),
  subject: z.string().trim().min(1, "Matière requise."),
  sessionDate: z.string().min(1, "Date requise."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format attendu HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format attendu HH:MM"),
  reason: z.string().trim().optional().or(z.literal("")),
});

export const homeworkSchema = z.object({
  classId: z.string().uuid().optional().or(z.literal("")),
  className: z.string().trim().min(1, "Classe requise."),
  subject: z.string().trim().min(1, "Matière requise."),
  description: z.string().trim().min(1, "Description requise."),
  dueDate: z.string().min(1, "Date limite requise."),
  priority: z.enum(["low", "medium", "high"]),
});

export const examSchema = z.object({
  classId: z.string().uuid().optional().or(z.literal("")),
  className: z.string().trim().min(1, "Classe requise."),
  subject: z.string().trim().min(1, "Matière requise."),
  type: z.enum(["controle", "synthese"]),
  examDate: z.string().min(1, "Date requise."),
  description: z.string().trim().optional().or(z.literal("")),
  teacherNotes: z.string().trim().optional().or(z.literal("")),
});

export const documentAccountSchema = z.object({
  fullName: z.string().trim().min(1, "Nom requis."),
  phone: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Numéro invalide (8 chiffres)."),
  childFirstName: z.string().trim().min(1, "Prénom de l'enfant requis."),
  childClass: z.string().trim().min(1, "Classe requise."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: string;
    }
  | undefined;
