import { z } from 'zod';

export const createVariantSchema = z.object({
  productId: z.string().min(1, 'Pilih produk induk'),
  name: z.string().min(1, 'Nama varian minimal 1 karakter').max(100, 'Nama varian maksimal 100 karakter'),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const).default('ACTIVE'),
});

export const updateVariantSchema = z.object({
  name: z.string().min(1, 'Nama varian minimal 1 karakter').max(100, 'Nama varian maksimal 100 karakter'),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

export type CreateVariantFormValues = z.infer<typeof createVariantSchema>;
export type UpdateVariantFormValues = z.infer<typeof updateVariantSchema>;
