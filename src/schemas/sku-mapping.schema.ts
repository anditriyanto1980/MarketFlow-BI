import { z } from 'zod';

export const createSkuMappingSchema = z.object({
  storeId: z.string().min(1, 'Pilih toko marketplace'),
  internalSkuId: z.string().min(1, 'Pilih SKU internal MarketFlow target'),
  externalSku: z.string().min(1, 'SKU marketplace / variasi wajib diisi').max(128, 'Maksimal 128 karakter'),
  externalProductName: z.string().max(200, 'Nama produk marketplace maksimal 200 karakter').optional().or(z.literal('')),
  externalVariantName: z.string().max(100, 'Nama variasi marketplace maksimal 100 karakter').optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const).default('ACTIVE'),
});

export const updateSkuMappingSchema = z.object({
  internalSkuId: z.string().min(1, 'Pilih SKU internal MarketFlow target'),
  externalSku: z.string().min(1, 'SKU marketplace wajib diisi').max(128),
  externalProductName: z.string().max(200).optional().or(z.literal('')),
  externalVariantName: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
});

export type CreateSkuMappingFormValues = z.infer<typeof createSkuMappingSchema>;
export type UpdateSkuMappingFormValues = z.infer<typeof updateSkuMappingSchema>;
