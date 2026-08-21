import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().trim().min(1, "Écris quelque chose avant de publier."),
});

export const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().trim().min(1, "Le commentaire ne peut pas être vide."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      success?: string;
    }
  | undefined;
