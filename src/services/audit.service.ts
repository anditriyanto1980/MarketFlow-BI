import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/utils/errors';
import type { AuditLog } from '@/src/types/common';

export async function recordAuditLog(
  businessId: string,
  userId: string,
  action: string,
  metadata?: {
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const auditLogsPath = `businesses/${businessId}/auditLogs`;
  try {
    const logDocRef = doc(collection(db, auditLogsPath));
    await setDoc(logDocRef, {
      businessId,
      userId,
      action,
      entityType: metadata?.entityType || null,
      entityId: metadata?.entityId || null,
      metadata: metadata?.details || {},
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, auditLogsPath);
  }
}

export async function getAuditLogs(businessId: string, maxLimit = 50): Promise<AuditLog[]> {
  const auditLogsPath = `businesses/${businessId}/auditLogs`;
  try {
    const q = query(collection(db, auditLogsPath), orderBy('createdAt', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLog, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, auditLogsPath);
  }
}
