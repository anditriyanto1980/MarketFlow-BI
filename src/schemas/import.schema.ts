import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const manualReportSelectionSchema = z.object({
  reportType: z.enum(['SHOPEE_ORDER_ALL', 'SHOPEE_INCOME'] as const),
});

export type ManualReportSelectionFormValues = z.infer<typeof manualReportSelectionSchema>;

export function validateFileParameters(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan.' };
  }

  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith('.xlsx');
  const isCsv = name.endsWith('.csv');
  const isXls = name.endsWith('.xls');

  if (isXls) {
    return {
      valid: false,
      error: 'Format XLS lama belum didukung. Silakan simpan ulang sebagai XLSX atau CSV di Excel.',
    };
  }

  if (!isXlsx && !isCsv) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap unggah file spreadsheet berekstensi .xlsx atau .csv.',
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'File kosong atau tidak memiliki data.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Ukuran file terlalu besar. Maksimal 50 MB.',
    };
  }

  return { valid: true };
}
