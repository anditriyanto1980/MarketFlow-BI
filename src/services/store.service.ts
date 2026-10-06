import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/utils/errors';
import { recordAuditLog } from './audit.service';
import type { Store, CreateStoreInput } from '@/src/types/store';

export async function createStore(
  businessId: string,
  userId: string,
  input: CreateStoreInput
): Promise<Store> {
  const path = `businesses/${businessId}/stores`;
  try {
    const storeRef = doc(collection(db, path));
    const newStore = {
      businessId,
      marketplace: input.marketplace,
      storeName: input.storeName.trim(),
      externalStoreId: input.externalStoreId?.trim() || '',
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(storeRef, newStore);

    await recordAuditLog(businessId, userId, 'STORE_CREATED', {
      entityType: 'STORE',
      entityId: storeRef.id,
      details: { storeName: input.storeName, marketplace: input.marketplace },
    });

    return {
      id: storeRef.id,
      ...newStore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as Store;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getStores(businessId: string): Promise<Store[]> {
  const path = `businesses/${businessId}/stores`;
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Store, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateStore(
  businessId: string,
  storeId: string,
  userId: string,
  data: Partial<Pick<Store, 'storeName' | 'status' | 'externalStoreId'>>
): Promise<void> {
  const path = `businesses/${businessId}/stores/${storeId}`;
  try {
    const storeRef = doc(db, path);
    await updateDoc(storeRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'STORE_UPDATED', {
      entityType: 'STORE',
      entityId: storeId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStore(businessId: string, storeId: string, userId: string): Promise<void> {
  const path = `businesses/${businessId}/stores/${storeId}`;
  try {
    await deleteDoc(doc(db, path));
    await recordAuditLog(businessId, userId, 'STORE_DELETED', {
      entityType: 'STORE',
      entityId: storeId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
