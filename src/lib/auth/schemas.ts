import { z } from "zod";

const password = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.");
const cin = z.string().trim().min(8, "CIN invalide.").max(8, "CIN invalide.");

export const registerManualSchema = z.object({
  cin,
  password,
  parentFirstName: z.string().trim().min(1, "Champ requis."),
  parentLastName: z.string().trim().min(1, "Champ requis."),
  childFirstName: z.string().trim().min(1, "Champ requis."),
  childClass: z.string().trim().min(1, "Champ requis."),
});

export const registerEmailSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  password,
  parentFirstName: z.string().trim().min(1, "Champ requis."),
  parentLastName: z.string().trim().min(1, "Champ requis."),
  childFirstName: z.string().trim().min(1, "Champ requis."),
  childClass: z.string().trim().min(1, "Champ requis."),
});

export const loginCinSchema = z.object({
  cin,
  password: z.string().min(1, "Champ requis."),
});

export const loginEmailSchema = z.object({
  email: z.string().trim().email("Email invalide."),
  password: z.string().min(1, "Champ requis."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;
