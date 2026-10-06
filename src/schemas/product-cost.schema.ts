import { z } from 'zod';

export const createProductCostSchema = z.object({
  skuId: z.string().min(1, 'Pilih SKU terkait'),
  costType: z.enum([
    'PRODUCT_COST',
    'PACKAGING',
    'BOX',
    'BUBBLE_WRAP',
    'STICKER',
    'LABEL',
    'OTHER',
  ] as const),
  amount: z.number().min(0, 'Nilai HPP/biaya tidak boleh bernilai negatif'),
  effectiveFrom: z.string().min(1, 'Tanggal mulai berlaku wajib diisi'),
  effectiveTo: z.string().optional().or(z.literal('')),
});

export const updateProductCostSchema = z.object({
  costType: z.enum([
    'PRODUCT_COST',
    'PACKAGING',
    'BOX',
    'BUBBLE_WRAP',
    'STICKER',
    'LABEL',
    'OTHER',
  ] as const),
  amount: z.number().min(0, 'Nilai HPP/biaya tidak boleh bernilai negatif'),
  effectiveFrom: z.string().min(1, 'Tanggal mulai berlaku wajib diisi'),
  effectiveTo: z.string().optional().or(z.literal('')),
});

export type CreateProductCostFormValues = z.infer<typeof createProductCostSchema>;
export type UpdateProductCostFormValues = z.infer<typeof updateProductCostSchema>;
