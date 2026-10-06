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
// 1. STORAGE HEALTH TEST (SECTION 11)
// ==========================================

export interface StorageHealthTestResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  storageBucket: string;
  storagePath: string;
  httpStatus?: number;
}

export async function runStorageHealthTest(
  businessId: string,
  userId: string
): Promise<StorageHealthTestResult> {
  const fileName = 'marketflow-storage-test.txt';
  const storagePath = `businesses/${businessId}/storage-test/${userId}/${fileName}`;
  const bucket = firebaseConfig.storageBucket || '';

  console.log('[STORAGE HEALTH TEST] Starting direct health check...');
  console.log(`[STORAGE HEALTH TEST] storageBucket = ${bucket}`);
  console.log(`[STORAGE HEALTH TEST] storagePath = ${storagePath}`);

  // 1. Direct REST probe to verify bucket existence
  try {
    const probeUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
    const res = await fetch(probeUrl);
    if (res.status === 404) {
      console.error(`[STORAGE HEALTH TEST] Bucket "${bucket}" returned HTTP 404 (Not Found).`);
      return {
        success: false,
        errorCode: 'storage/bucket-not-found',
        errorMessage: `Bucket "${bucket}" belum diaktifkan/dibuat di Google Cloud Storage (HTTP 404 Not Found). Silakan buka Firebase Console dan klik "Get Started" pada menu Build > Storage.`,
        storageBucket: bucket,
        storagePath,
        httpStatus: 404,
      };
    }
  } catch (probeErr) {
    console.warn('[STORAGE HEALTH TEST] Probe network check:', probeErr);
  }

  // 2. Direct small file upload via SDK
  try {
    const testBlob = new Blob(['MarketFlow Storage Health Check: ' + new Date().toISOString()], {
      type: 'text/plain',
    });
    const storageRef = ref(storage, storagePath);

    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, testBlob, {
        contentType: 'text/plain',
        customMetadata: { test: 'true', userId, timestamp: new Date().toISOString() },
      });

      const timer = setTimeout(() => {
        try { task.cancel(); } catch { /* ignore */ }
        reject(new Error('storage/retry-limit-exceeded: Waktu tunggu habis saat menghubungi storage bucket.'));
      }, 8000);

      task.on(
        'state_changed',
        null,
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
        () => {
          clearTimeout(timer);
          resolve();
        }
      );
    });

    console.log('[STORAGE HEALTH TEST] UPLOAD SUCCESS');
    return {
      success: true,
      storageBucket: bucket,
      storagePath,
    };
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string };
    console.error('[STORAGE HEALTH TEST] Direct upload error:', errObj);
    return {
      success: false,
      errorCode: errObj?.code || 'storage/unknown',
      errorMessage: errObj?.message || String(err),
      storageBucket: bucket,
      storagePath,
    };
  }
}

// ==========================================
// 2. DUPLICATE CHECK BY SHA-256
// ==========================================

export async function findExistingImportByHash(
  businessId: string,
  fileHash: string,
  timeoutMs = 8000
): Promise<ImportFile | null> {
  const path = `businesses/${businessId}/importFiles`;
  console.log(`[IMPORT DEBUG] duplicate-check-start: hash=${fileHash}`);
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
          () => reject(new Error('Proses pengecekan duplikasi timeout.')),
          timeoutMs
        )
      ),
    ]);

    const found = !snap.empty;
    console.log(`[IMPORT DEBUG] duplicate-check-complete: found=${found}`);
    if (found) {
      const d = snap.docs[0];
      return {
        id: d.id,
        ...(d.data() as Omit<ImportFile, 'id'>),
      };
    }
    return null;
  } catch (error) {
    console.error('[IMPORT DEBUG] duplicate-check-error:', error);
    if (error instanceof Error && error.message.includes('timeout')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// 3. FIREBASE STORAGE RAW FILE UPLOAD
// ==========================================

export async function uploadRawFileToStorage(
  businessId: string,
  importFileId: string,
  originalFileName: string,
  fileData: Blob | Uint8Array,
  mimeType?: string
): Promise<string> {
  const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const storagePath = `businesses/${businessId}/imports/${importFileId}/original/${cleanFileName}`;
  const bucket = firebaseConfig.storageBucket || '';

  // Required Section 7 Debug Logging:
  console.log(`[IMPORT DEBUG] businessId = ${businessId}`);
  console.log(`[IMPORT DEBUG] importFileId = ${importFileId}`);
  console.log(`[IMPORT DEBUG] storagePath = ${storagePath}`);
  console.log(`[IMPORT DEBUG] storageBucket = ${bucket}`);

  // Pre-flight check: Verify if the Storage Bucket exists before allowing SDK 10-minute retry loop
  try {
    const probeRes = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`);
    if (probeRes.status === 404) {
      console.error(`[IMPORT DEBUG] Firebase Storage Error Code: storage/bucket-not-found`);
      console.error(`[IMPORT DEBUG] Firebase Storage Error Message: Bucket "${bucket}" does not exist (404 Not Found).`);
      throw new Error(
        `storage/bucket-not-found: Bucket "${bucket}" belum diaktifkan di Firebase Console. Buka Firebase Console > Build > Storage dan klik "Get Started".`
      );
    }
  } catch (fetchErr: unknown) {
    if (fetchErr instanceof Error && fetchErr.message.includes('storage/bucket-not-found')) {
      throw fetchErr;
    }
    // Network or other probe error, continue to SDK
  }

  const storageRef = ref(storage, storagePath);

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
        console.warn(`[IMPORT DEBUG] storage-upload timeout after 15000ms, cancelling task...`);
        try {
          uploadTask.cancel();
        } catch {
          // ignore
        }
        reject(new Error('storage/retry-limit-exceeded: Proses upload terlalu lama. Periksa koneksi dan konfigurasi Firebase.'));
      }
    }, 15000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = snapshot.totalBytes > 0 ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100 : 0;
        console.log(`[IMPORT DEBUG] storage-upload progress: ${progress.toFixed(0)}%`);
      },
      (error) => {
        if (!isSettled) {
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          // Required Section 9 Real Firebase Error Logging:
          console.error(`[IMPORT DEBUG] Firebase Storage Error Code: ${error.code}`);
          console.error(`[IMPORT DEBUG] Firebase Storage Error Message: ${error.message}`);
          reject(error);
        }
      },
      () => {
        if (!isSettled) {
          isSettled = true;
          if (timeoutTimer) clearTimeout(timeoutTimer);
          console.log(`[IMPORT DEBUG] storage-upload-complete: ${storagePath}`);
          resolve(storagePath);
        }
      }
    );
  });
}

// ==========================================
// 4. MASTER IMPORT UPLOAD & DETECTION FLOW
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

  // 2. Read ArrayBuffer & Calculate SHA-256
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
          () => reject(new Error('Proses simpan Firestore timeout.')),
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
    handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}/importFiles/${importFileId}`);
  }
}

// ==========================================
// 5. MANUAL REPORT TYPE SELECTION (FALLBACK)
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
// 6. QUERY IMPORT FILES
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
