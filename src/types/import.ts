import type { Timestamp } from 'firebase/firestore';

export type ImportReportType = 'SHOPEE_ORDER_ALL' | 'SHOPEE_INCOME' | 'UNKNOWN';

export type ImportStatus =
  | 'UPLOADING'
  | 'UPLOADED'
  | 'READING'
  | 'DETECTED'
  | 'NEEDS_REVIEW'
  | 'FAILED';

export type DetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type DetectionMethod =
  | 'HEADER_SIGNATURE'
  | 'FILENAME_SIGNATURE'
  | 'MANUAL'
  | 'UNKNOWN';

export interface ImportFile {
  id: string;
  businessId: string;
  uploadedBy: string;
  uploadedByName?: string;
  originalFileName: string;
  storagePath: string;
  fileExtension: 'xlsx' | 'csv';
  mimeType?: string;
  fileSizeBytes: number;
  fileHash: string; // SHA-256
  detectedMarketplace: 'SHOPEE' | 'UNKNOWN';
  detectedReportType: ImportReportType;
  detectionConfidence: DetectionConfidence;
  detectionMethod: DetectionMethod;
  headerCount?: number;
  rowCountPreview?: number;
  selectedSheetName?: string;
  availableSheetNames?: string[];
  detectedHeaders?: string[];
  normalizedHeaders?: string[];
  previewRows?: Record<string, unknown>[];
  status: ImportStatus;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export type ImportBatchStatus =
  | 'CREATED'
  | 'READY_FOR_MAPPING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface ImportBatch {
  id: string;
  businessId: string;
  importFileId: string;
  reportType: ImportReportType;
  status: ImportBatchStatus;
  createdBy: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface DetectionResult {
  marketplace: 'SHOPEE' | 'UNKNOWN';
  reportType: ImportReportType;
  confidence: DetectionConfidence;
  method: DetectionMethod;
  scores: {
    orderAll: number;
    income: number;
  };
  matchedSignatures: string[];
  normalizedHeaders: string[];
}
