import { z } from 'zod';

export const createSkuSchema = z.object({
  productId: z.string().min(1, 'Pilih produk terkait'),
  variantId: z.string().optional().or(z.literal('')),
  skuCode: z
    .string()
    .min(1, 'Kode SKU wajib diisi')
    .max(64, 'Kode SKU maksimal 64 karakter')
    .regex(/^[a-zA-Z0-9_\-\.\/]+$/, 'Kode SKU hanya boleh mengandung huruf, angka, dash, titik, atau slash'),
  barcode: z.string().max(64, 'Barcode maksimal 64 karakter').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const).default('ACTIVE'),
});

export const updateSkuSchema = z.object({
  skuCode: z
    .string()
    .min(1, 'Kode SKU wajib diisi')
    .max(64, 'Kode SKU maksimal 64 karakter'),
  barcode: z.string().max(64).optional().or(z.literal('')),
  variantId: z.string().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

export type CreateSkuFormValues = z.infer<typeof createSkuSchema>;
export type UpdateSkuFormValues = z.infer<typeof updateSkuSchema>;
