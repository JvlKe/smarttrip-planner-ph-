import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().nullable(),
  // A starting point is required to create a trip, not to create an account.
  location: z
    .string()
    .trim()
    .min(2, "Enter your trip starting point.")
    .max(160)
    .optional()
    .nullable(),
  bio: z.string().trim().max(400).optional().nullable(),
  avatarData: z
    .string()
    .max(750000)
    .refine(
      (value) => !value || /^data:image\/(webp|jpeg|png);base64,/.test(value),
      "Invalid profile image.",
    )
    .optional()
    .nullable(),
});
