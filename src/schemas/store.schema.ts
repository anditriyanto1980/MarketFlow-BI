import { z } from 'zod';

export const createStoreSchema = z.object({
  marketplace: z.enum(['SHOPEE', 'TIKTOK', 'TOKOPEDIA'] as const),
  storeName: z.string().min(2, 'Nama toko minimal 2 karakter').max(128, 'Nama toko maksimal 128 karakter'),
  externalStoreId: z.string().max(128).optional().or(z.literal('')),
});

export const updateStoreSchema = z.object({
  storeName: z.string().min(2, 'Nama toko minimal 2 karakter').max(128, 'Nama toko maksimal 128 karakter'),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

export type CreateStoreFormValues = z.infer<typeof createStoreSchema>;
export type UpdateStoreFormValues = z.infer<typeof updateStoreSchema>;
