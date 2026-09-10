import { z } from "zod";

const password = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.");
const cin = z.string().trim().min(8, "CIN invalide.").max(8, "CIN invalide.");
const phone = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "Numéro invalide (8 chiffres, ex: 99766801).");

// Registering by phone: the phone number IS the identifier (it becomes the
// synthetic @cpk.internal auth email). CIN used to be required here, but
// asking a parent for their national ID card number just to sign up was too
// intrusive for almost anyone to accept — it's now purely optional, added
// later from their own profile page if they want to (see
// updateProfileInfoSchema below).
export const registerManualSchema = z.object({
  phone,
  password,
  parentFirstName: z.string().trim().min(1, "Champ requis."),
  parentLastName: z.string().trim().min(1, "Champ requis."),
  childFirstName: z.string().trim().min(1, "Champ requis."),
  childClass: z.string().trim().min(1, "Champ requis."),
});

export const registerEmailSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  phone,
  password,
  parentFirstName: z.string().trim().min(1, "Champ requis."),
  parentLastName: z.string().trim().min(1, "Champ requis."),
  childFirstName: z.string().trim().min(1, "Champ requis."),
  childClass: z.string().trim().min(1, "Champ requis."),
});

export const loginPhoneSchema = z.object({
  phone,
  password: z.string().min(1, "Champ requis."),
});

export const loginEmailSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  password: z.string().min(1, "Champ requis."),
});

export const loginChildSchema = z.object({
  studentId: z.string().uuid("Élève invalide."),
  password: z.string().min(1, "Champ requis."),
});

export const updateProfileInfoSchema = z.object({
  fullName: z.string().trim().min(1, "Champ requis."),
  phone,
  cin: z.string().trim().length(0).or(cin),
  contactEmail: z.string().trim().length(0).or(z.string().trim().email("Email invalide.")),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: string;
    }
  | undefined;
