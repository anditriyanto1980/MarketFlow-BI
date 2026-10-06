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
import { ref, uploadBytesResumable, getStorage } from 'firebase/storage';
import { db, storage, app } from '@/src/lib/firebase/client';
import { firebaseConfig } from '@/src/lib/firebase/config';
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
  fileHash: string,
  timeoutMs = 8000
): Promise<ImportFile | null> {
  const path = `businesses/${businessId}/importFiles`;
  console.log(`[IMPORT] duplicate-check-start: hash=${fileHash}`);
  try {
    const q = query(
      collection(db, path),
      where('fileHash', '==', fileHash),
      limit(1)
    );

    const snap = await Promise.race([
      getDocs(q),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Proses upload terlalu lama. Periksa koneksi dan konfigurasi Firebase.')),
          timeoutMs
        )
      ),
    ]);

    const found = !snap.empty;
    console.log(`[IMPORT] duplicate-check-complete: found=${found}`);
    if (found) {
      const d = snap.docs[0];
      return {
        id: d.id,
        ...(d.data() as Omit<ImportFile, 'id'>),
      };
    }
    return null;
  } catch (error) {
    console.error(`[IMPORT] duplicate-check-error:`, error);
    if (error instanceof Error && error.message.includes('terlalu lama')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// 2. FIREBASE STORAGE RAW FILE UPLOAD
// ==========================================

async function executeUploadTask(
  storageInstance: typeof storage,
  businessId: string,
  importFileId: string,
  cleanFileName: string,
  fileData: Blob | Uint8Array,
  mimeType?: string,
  timeoutMs = 15000
): Promise<string> {
  const storagePath = `businesses/${businessId}/imports/${importFileId}/original/${cleanFileName}`;
  console.log(`[IMPORT] storage-upload-start: path=${storagePath}`);
  const storageRef = ref(storageInstance, storagePath);

  return new Promise((resolve, reject) => {
    let timeoutTimer: NodeJS.Timeout | null = null;
    let isSettled = false;

    const uploadTask = uploadBytesResumable(storageRef, fileData, {
      contentType: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      customMetadata: {
        businessId,
        importFileId,
        originalFileName: cleanFileName,
      },
    });

    timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        console.warn(`[IMPORT] storage-upload timeout after ${timeoutMs}ms, cancelling task...`);
        try {
          uploadTask.cancel();
        } catch {
          // ignore cancel error
        }
        reject(new Error('Proses upload terlalu lama. Periksa koneksi dan konfigurasi Firebase.'));
      }
    }, timeoutMs);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
        console.log(`[IMPORT] storage-upload progress: ${progress.toFixed(0)}%`);
      },
      (error) => {
        if (!isSettled) {
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          console.error('[IMPORT] storage-upload error:', error);
          if (error.code === 'storage/unauthorized') {
            reject(new Error('Anda tidak memiliki izin untuk mengunggah file ke workspace ini.'));
          } else if (error.code === 'storage/canceled' || error.code === 'storage/retry-limit-exceeded') {
            reject(new Error('Proses upload terlalu lama. Periksa koneksi dan konfigurasi Firebase.'));
          } else if (error.code === 'storage/bucket-not-found') {
            reject(error);
          } else {
            reject(new Error('Terjadi masalah saat menyimpan file. Silakan coba lagi.'));
          }
        }
      },
      () => {
        if (!isSettled) {
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          console.log(`[IMPORT] storage-upload-complete: ${storagePath}`);
          resolve(storagePath);
        }
      }
    );
  });
}

export async function uploadRawFileToStorage(
  businessId: string,
  importFileId: string,
  originalFileName: string,
  fileData: Blob | Uint8Array,
  mimeType?: string
): Promise<string> {
  const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9._\-]/g, '_');

  try {
    return await executeUploadTask(storage, businessId, importFileId, cleanFileName, fileData, mimeType, 15000);
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    if (errorObj?.code === 'storage/bucket-not-found' || errorObj?.message?.includes('bucket-not-found')) {
      const rawBucket = firebaseConfig.storageBucket || '';
      if (rawBucket.includes('firebasestorage.app')) {
        const fallbackBucket = rawBucket.replace('firebasestorage.app', 'appspot.com');
        console.warn(`[IMPORT] Primary bucket not found, attempting fallback to: ${fallbackBucket}`);
        try {
          const fallbackStorage = getStorage(app, fallbackBucket);
          fallbackStorage.maxUploadRetryTime = 12000;
          return await executeUploadTask(fallbackStorage, businessId, importFileId, cleanFileName, fileData, mimeType, 15000);
        } catch (fallbackErr) {
          console.error('[IMPORT] Fallback storage also failed:', fallbackErr);
        }
      }
    }
    throw err;
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
  preferredSheetName?: string,
  onProgress?: (stage: string) => void
): Promise<ProcessImportResult> {
  console.log(`[IMPORT] file-selected: ${file.name} (${file.size} bytes)`);

  // 1. Validation
  console.log('[IMPORT] validation-start');
  const validation = validateFileParameters(file);
  if (!validation.valid) {
    console.error(`[IMPORT] validation-failed: ${validation.error}`);
    throw new Error(validation.error);
  }
  console.log('[IMPORT] validation-complete');

  // 2. Read ArrayBuffer & calculate SHA-256
  onProgress?.('Membaca berkas dan menghitung checksum SHA-256...');
  console.log('[IMPORT] hash-start');
  const buffer = await file.arrayBuffer();
  const fileExtension = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';
  const fileHash = await calculateFileSha256(buffer);
  console.log(`[IMPORT] hash-complete: ${fileHash}`);

  // 3. Duplicate Check
  onProgress?.('Mengecek duplikasi berkas di workspace...');
  console.log('[IMPORT] duplicate-check-start');
  const existing = await findExistingImportByHash(businessId, fileHash);
  console.log(`[IMPORT] duplicate-check-complete: duplicate=${Boolean(existing)}`);
  if (existing) {
    return {
      isDuplicate: true,
      importFile: existing,
    };
  }

  // 4. Storage Upload
  onProgress?.('Mengunggah raw file ke Cloud Storage...');
  console.log('[IMPORT] storage-upload-start');
  const importFileRef = doc(collection(db, `businesses/${businessId}/importFiles`));
  const importFileId = importFileRef.id;

  const storagePath = await uploadRawFileToStorage(
    businessId,
    importFileId,
    file.name,
    file,
    file.type
  );
  console.log(`[IMPORT] storage-upload-complete: ${storagePath}`);

  // 5. Parser Start
  onProgress?.('Membaca baris dan kolom spreadsheet...');
  console.log('[IMPORT] parser-start');
  let parseResult;
  try {
    parseResult = await parseSpreadsheetBuffer(buffer, fileExtension, preferredSheetName, 20);
    console.log(`[IMPORT] parser-complete: headers=${parseResult.headers.length}, rows=${parseResult.rowCountPreview}`);
  } catch (err: unknown) {
    console.error('[IMPORT] parser-failed:', err);
    throw new Error(
      err instanceof Error
        ? err.message
        : 'Gagal membaca isi spreadsheet. Pastikan file tidak rusak atau terproteksi kata sandi.'
    );
  }

  // 6. Detection Start
  onProgress?.('Menjalankan deteksi tanda tangan Shopee...');
  console.log('[IMPORT] detection-start');
  const detectionResult = detectShopeeReport(parseResult.headers, file.name);
  console.log(`[IMPORT] detection-complete: ${detectionResult.reportType} (${detectionResult.confidence})`);

  // 7. Firestore Write
  onProgress?.('Menyimpan data import ke Firestore...');
  console.log('[IMPORT] firestore-write-start');
  const finalStatus = detectionResult.reportType === 'UNKNOWN' ? 'NEEDS_REVIEW' : 'DETECTED';

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
    await Promise.race([
      setDoc(importFileRef, newImportFile),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Proses upload terlalu lama. Periksa koneksi dan konfigurasi Firebase.')),
          10000
        )
      ),
    ]);

    // Batch creation if detected
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

    // Audit log
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

    console.log(`[IMPORT] firestore-write-complete: id=${importFileId}`);

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
    console.error('[IMPORT] firestore-write-error:', error);
    if (error instanceof Error && error.message.includes('terlalu lama')) {
      throw error;
    }
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
