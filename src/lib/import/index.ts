import type { Timestamp } from 'firebase/firestore';

export interface ImportFile {
  id: string;
  businessId: string;
  storeId: string;
  marketplace: 'SHOPEE' | 'TIKTOK' | 'TOKOPEDIA';
  fileType: 'ORDERS' | 'SETTLEMENT' | 'RETURNS' | 'FEES';
  fileName: string;
  fileSize: number;
  storagePath: string;
  uploadedBy: string;
  createdAt: Timestamp | string;
}

export interface ImportBatch {
  id: string;
  businessId: string;
  fileId: string;
  status: 'PENDING' | 'PARSING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdAt: Timestamp | string;
  completedAt?: Timestamp | string;
}

export interface ImportRow {
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData?: Record<string, unknown>;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  errorMessage?: string;
}

export interface ImportResult {
  batchId: string;
  success: boolean;
  totalProcessed: number;
  totalImported: number;
  errors: string[];
}
