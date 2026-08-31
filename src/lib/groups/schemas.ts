import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(60, "60 caractères max."),
});

export const groupMessageSchema = z.object({
  groupId: z.string().uuid(),
  content: z.string().trim().min(1, "Message vide.").max(2000, "Message trop long."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: string;
    }
  | undefined;
