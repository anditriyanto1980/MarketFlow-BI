import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter').max(200, 'Nama produk maksimal 200 karakter'),
  brand: z.string().max(100, 'Merek maksimal 100 karakter').optional().or(z.literal('')),
  category: z.string().max(100, 'Kategori maksimal 100 karakter').optional().or(z.literal('')),
  description: z.string().max(1000, 'Deskripsi maksimal 1000 karakter').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const).default('ACTIVE'),
});

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter').max(200, 'Nama produk maksimal 200 karakter'),
  brand: z.string().max(100).optional().or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
