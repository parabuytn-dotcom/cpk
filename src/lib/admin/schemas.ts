import { z } from "zod";

export const timetableEntrySchema = z.object({
  classId: z.string().uuid(),
  className: z.string().trim().min(1),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format attendu HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format attendu HH:MM"),
  subject: z.string().trim().min(1),
  teacherName: z.string().trim().min(1),
});

export const teacherAbsenceSchema = z
  .object({
    teacherId: z.string().uuid(),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    reason: z.string().trim().optional(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "La date de fin doit être après la date de début.",
    path: ["endsAt"],
  })
  .refine(
    (data) =>
      new Date(data.endsAt).getTime() - new Date(data.startsAt).getTime() <=
      90 * 24 * 60 * 60 * 1000,
    { message: "La période d'absence ne peut pas dépasser 90 jours.", path: ["endsAt"] },
  );

export const csvRowSchema = z.object({
  Jour: z.coerce.number().int().min(1).max(7),
  Heure_Début: z.string().regex(/^\d{2}:\d{2}$/),
  Heure_Fin: z.string().regex(/^\d{2}:\d{2}$/),
  Matière: z.string().trim().min(1),
  Professeur: z.string().trim().min(1),
});

export const userUpdateSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["parent", "student", "teacher", "admin", "staff"]),
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

export const homeworkSchema = z.object({
  classId: z.string().uuid().optional().or(z.literal("")),
  className: z.string().trim().min(1, "Classe requise."),
  subject: z.string().trim().min(1, "Matière requise."),
  description: z.string().trim().min(1, "Description requise."),
  dueDate: z.string().min(1, "Date limite requise."),
  priority: z.enum(["low", "medium", "high"]),
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
