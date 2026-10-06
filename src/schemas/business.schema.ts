import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(128, 'Nama bisnis maksimal 128 karakter'),
  businessType: z.enum(['UMKM', 'ONLINE_SELLER', 'RETAIL', 'DISTRIBUTOR', 'OTHER'] as const),
  currency: z.literal('IDR').default('IDR'),
  timezone: z.literal('Asia/Jakarta').default('Asia/Jakarta'),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(128, 'Nama bisnis maksimal 128 karakter'),
  businessType: z.enum(['UMKM', 'ONLINE_SELLER', 'RETAIL', 'DISTRIBUTOR', 'OTHER'] as const),
});

export type CreateBusinessFormValues = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessFormValues = z.infer<typeof updateBusinessSchema>;
