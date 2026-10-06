import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/utils/errors';
import { recordAuditLog } from './audit.service';
import { calculateFileSha256 } from '@/src/lib/import/hash';
import { parseSpreadsheetBuffer } from '@/src/lib/import/parsers/spreadsheet.parser';
import { detectShopeeReport } from '@/src/lib/import/detection/shopeeDetector';
import { validateFileParameters } from '@/src/schemas/import.schema';
import type {
  ImportFile,
  ImportBatch,
  ImportReportType,
  DetectionResult,
} from '@/src/types/import';

// ==========================================
// 1. DUPLICATE CHECK BY SHA-256
// ==========================================

export async function findExistingImportByHash(
  businessId: string,
  fileHash: string
): Promise<ImportFile | null> {
  const path = `businesses/${businessId}/importFiles`;
  try {
    const q = query(
      collection(db, path),
      where('fileHash', '==', fileHash),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return {
        id: d.id,
        ...(d.data() as Omit<ImportFile, 'id'>),
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// 2. FIREBASE STORAGE RAW FILE UPLOAD
// ==========================================

export async function uploadRawFileToStorage(
  businessId: string,
  importFileId: string,
  originalFileName: string,
  fileBytes: ArrayBuffer,
  mimeType?: string
): Promise<string> {
  const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const storagePath = `businesses/${businessId}/imports/${importFileId}/original/${cleanFileName}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, new Uint8Array(fileBytes), {
      contentType: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      customMetadata: {
        businessId,
        importFileId,
        originalFileName,
      },
    });
    return storagePath;
  } catch (error) {
    console.error('Storage upload error:', error);
    throw new Error('File berhasil dibaca tetapi gagal disimpan ke penyimpanan cloud. Silakan coba lagi.');
  }
}

// ==========================================
// 3. MASTER IMPORT UPLOAD & DETECTION FLOW
// ==========================================

export interface ProcessImportResult {
  isDuplicate: boolean;
  importFile: ImportFile;
  detectionResult?: DetectionResult;
  batch?: ImportBatch;
}

export async function processImportFile(
  businessId: string,
  userId: string,
  userDisplayName: string,
  file: File,
  preferredSheetName?: string
): Promise<ProcessImportResult> {
  // 1. Validation
  const validation = validateFileParameters(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 2. Read ArrayBuffer
  const buffer = await file.arrayBuffer();
  const fileExtension = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';

  // 3. Calculate SHA-256 Hash
  const fileHash = await calculateFileSha256(buffer);

  // 4. Duplicate Check
  const existing = await findExistingImportByHash(businessId, fileHash);
  if (existing) {
    return {
      isDuplicate: true,
      importFile: existing,
    };
  }

  // 5. Parse Spreadsheet (extract headers & top 20 preview rows)
  let parseResult;
  try {
    parseResult = await parseSpreadsheetBuffer(buffer, fileExtension, preferredSheetName, 20);
  } catch (err: unknown) {
    console.error('Parse error:', err);
    throw new Error(
      err instanceof Error ? err.message : 'Gagal membaca isi spreadsheet. Pastikan file tidak rusak atau terproteksi kata sandi.'
    );
  }

  // 6. Header Signature Detection
  const detectionResult = detectShopeeReport(parseResult.headers, file.name);

  // 7. Prepare Firestore Document
  const importFileRef = doc(collection(db, `businesses/${businessId}/importFiles`));
  const importFileId = importFileRef.id;

  // 8. Upload RAW File to Firebase Storage
  const storagePath = await uploadRawFileToStorage(
    businessId,
    importFileId,
    file.name,
    buffer,
    file.type
  );

  const finalStatus =
    detectionResult.reportType === 'UNKNOWN' ? 'NEEDS_REVIEW' : 'DETECTED';

  const newImportFile: Omit<ImportFile, 'id'> = {
    businessId,
    uploadedBy: userId,
    uploadedByName: userDisplayName,
    originalFileName: file.name,
    storagePath,
    fileExtension,
    mimeType: file.type || '',
    fileSizeBytes: file.size,
    fileHash,
    detectedMarketplace: detectionResult.marketplace,
    detectedReportType: detectionResult.reportType,
    detectionConfidence: detectionResult.confidence,
    detectionMethod: detectionResult.method,
    headerCount: parseResult.headers.length,
    rowCountPreview: parseResult.rowCountPreview,
    selectedSheetName: parseResult.selectedSheetName,
    availableSheetNames: parseResult.sheetNames,
    detectedHeaders: parseResult.headers,
    normalizedHeaders: detectionResult.normalizedHeaders,
    previewRows: parseResult.previewRows,
    status: finalStatus,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  try {
    await setDoc(importFileRef, newImportFile);

    // 9. If recognized, prepare the ImportBatch (READY_FOR_MAPPING)
    let createdBatch: ImportBatch | undefined;
    if (detectionResult.reportType !== 'UNKNOWN') {
      const batchRef = doc(collection(db, `businesses/${businessId}/importBatches`));
      const newBatch: Omit<ImportBatch, 'id'> = {
        businessId,
        importFileId,
        reportType: detectionResult.reportType,
        status: 'READY_FOR_MAPPING',
        createdBy: userId,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };
      await setDoc(batchRef, newBatch);
      createdBatch = { id: batchRef.id, ...newBatch };
    }

    // 10. Audit Log
    await recordAuditLog(businessId, userId, 'IMPORT_FILE_UPLOADED', {
      entityType: 'IMPORT_FILE',
      entityId: importFileId,
      details: {
        fileName: file.name,
        fileHash,
        fileSizeBytes: file.size,
        reportType: detectionResult.reportType,
        marketplace: detectionResult.marketplace,
        confidence: detectionResult.confidence,
      },
    });

    const resultDoc: ImportFile = {
      id: importFileId,
      ...newImportFile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      isDuplicate: false,
      importFile: resultDoc,
      detectionResult,
      batch: createdBatch,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}/importFiles/${importFileId}`);
  }
}

// ==========================================
// 4. MANUAL REPORT TYPE SELECTION (FALLBACK)
// ==========================================

export async function setManualReportType(
  businessId: string,
  importFileId: string,
  userId: string,
  selectedReportType: ImportReportType
): Promise<void> {
  const path = `businesses/${businessId}/importFiles/${importFileId}`;
  try {
    const refDoc = doc(db, path);
    await updateDoc(refDoc, {
      detectedMarketplace: 'SHOPEE',
      detectedReportType: selectedReportType,
      detectionConfidence: 'MEDIUM',
      detectionMethod: 'MANUAL',
      status: 'DETECTED',
      updatedAt: serverTimestamp(),
    });

    // Create or update batch to READY_FOR_MAPPING
    const batchRef = doc(collection(db, `businesses/${businessId}/importBatches`));
    await setDoc(batchRef, {
      businessId,
      importFileId,
      reportType: selectedReportType,
      status: 'READY_FOR_MAPPING',
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await recordAuditLog(businessId, userId, 'IMPORT_REPORT_TYPE_SET_MANUAL', {
      entityType: 'IMPORT_FILE',
      entityId: importFileId,
      details: { manualReportType: selectedReportType },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// 5. QUERY IMPORT FILES
// ==========================================

export async function getImportFiles(
  businessId: string,
  maxLimit = 50
): Promise<ImportFile[]> {
  const path = `businesses/${businessId}/importFiles`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ImportFile, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getImportFile(
  businessId: string,
  importFileId: string
): Promise<ImportFile | null> {
  const path = `businesses/${businessId}/importFiles/${importFileId}`;
  try {
    const snap = await getDoc(doc(db, path));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<ImportFile, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
