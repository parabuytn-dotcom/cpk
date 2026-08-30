import { z } from "zod";

export const submitSuggestionSchema = z.object({
  content: z.string().trim().min(10, "Décris un peu plus ton idée (10 caractères min.)."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: string;
    }
  | undefined;
