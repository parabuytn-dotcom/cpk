import { z } from "zod";

export const uploadResourceSchema = z.object({
  classId: z.string().uuid(),
  className: z.string().trim().min(1),
  subject: z.string().trim().min(1, "Matière requise."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: string;
    }
  | undefined;
