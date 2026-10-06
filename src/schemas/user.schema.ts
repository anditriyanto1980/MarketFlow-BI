import { z } from 'zod';

export const userProfileSchema = z.object({
  uid: z.string().min(1, 'UID wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  displayName: z.string().min(2, 'Nama minimal 2 karakter').max(128, 'Nama maksimal 128 karakter'),
  photoURL: z.string().url().optional().or(z.literal('')),
  phoneNumber: z.string().max(32).optional().or(z.literal('')),
  onboardingCompleted: z.boolean().default(false),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Nama minimal 2 karakter').max(128, 'Nama maksimal 128 karakter'),
  phoneNumber: z.string().max(32).optional().or(z.literal('')),
});

export type UserProfileFormValues = z.infer<typeof userProfileSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
