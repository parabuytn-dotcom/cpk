import { z } from "zod";

// Amount is collected in whole TND from the user, converted to millimes
// (Konnect's unit, 1 TND = 1000) before hitting the API.
export const donationSchema = z.object({
  amount: z.coerce.number().min(1, "Le montant minimum est 1 DT.").max(2000, "Montant trop élevé."),
});

export type FormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;
