import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/utils/errors';
import { recordAuditLog } from './audit.service';
import type { Business, CreateBusinessInput } from '@/src/types/business';
import type { BusinessMember, UserRole } from '@/src/types/auth';
import type { CreateStoreInput } from '@/src/types/store';

export async function createBusinessWithMembership(
  userId: string,
  userEmail: string,
  userDisplayName: string,
  businessData: CreateBusinessInput,
  initialStore?: CreateStoreInput
): Promise<{ businessId: string; storeId?: string }> {
  const batch = writeBatch(db);

  const businessRef = doc(collection(db, 'businesses'));
  const businessId = businessRef.id;

  const newBusiness = {
    name: businessData.name.trim(),
    businessType: businessData.businessType,
    currency: 'IDR' as const,
    timezone: 'Asia/Jakarta' as const,
    ownerId: userId,
    status: 'ACTIVE' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.set(businessRef, newBusiness);

  // 2. Member document at businesses/{businessId}/members/{userId}
  const memberRef = doc(db, `businesses/${businessId}/members`, userId);
  const newMember: Omit<BusinessMember, 'joinedAt' | 'createdAt' | 'updatedAt'> & {
    joinedAt: ReturnType<typeof serverTimestamp>;
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    userId,
    role: 'OWNER',
    status: 'ACTIVE',
    userEmail,
    userDisplayName,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  batch.set(memberRef, newMember);

  // 3. User profile update (onboardingCompleted = true)
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, {
    onboardingCompleted: true,
    defaultBusinessId: businessId,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();

    // 4. Create initial store if provided (after business & owner member are committed)
    let storeId: string | undefined;
    if (initialStore && initialStore.storeName.trim()) {
      const storeRef = doc(collection(db, `businesses/${businessId}/stores`));
      storeId = storeRef.id;
      await setDoc(storeRef, {
        businessId,
        marketplace: initialStore.marketplace,
        storeName: initialStore.storeName.trim(),
        externalStoreId: initialStore.externalStoreId?.trim() || '',
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 5. Audit logs
    await recordAuditLog(businessId, userId, 'BUSINESS_CREATED', {
      entityType: 'BUSINESS',
      entityId: businessId,
      details: { name: businessData.name, businessType: businessData.businessType },
    });

    if (storeId && initialStore) {
      await recordAuditLog(businessId, userId, 'STORE_CREATED', {
        entityType: 'STORE',
        entityId: storeId,
        details: { storeName: initialStore.storeName, marketplace: initialStore.marketplace },
      });
    }

    return { businessId, storeId };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}`);
  }
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const path = `businesses/${businessId}`;
  try {
    const bDoc = await getDoc(doc(db, 'businesses', businessId));
    if (!bDoc.exists()) {
      return null;
    }
    return {
      id: bDoc.id,
      ...(bDoc.data() as Omit<Business, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getUserBusinesses(userId: string, defaultBusinessId?: string): Promise<Business[]> {
  const path = 'businesses';
  try {
    // 1. Direct owner query
    const ownerQuery = query(collection(db, path), where('ownerId', '==', userId));
    const ownerSnap = await getDocs(ownerQuery);
    const businesses: Business[] = ownerSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Business, 'id'>),
    }));

    // 2. If user is a member with a defaultBusinessId not yet included in owner results
    if (defaultBusinessId && !businesses.some((b) => b.id === defaultBusinessId)) {
      const targetBusiness = await getBusiness(defaultBusinessId);
      if (targetBusiness) {
        businesses.push(targetBusiness);
      }
    }

    return businesses;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateBusiness(
  businessId: string,
  userId: string,
  data: Partial<Pick<Business, 'name' | 'businessType' | 'status'>>
): Promise<void> {
  const path = `businesses/${businessId}`;
  try {
    const bRef = doc(db, 'businesses', businessId);
    await updateDoc(bRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(businessId, userId, 'BUSINESS_UPDATED', {
      entityType: 'BUSINESS',
      entityId: businessId,
      details: data as Record<string, unknown>,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getBusinessMembers(businessId: string): Promise<BusinessMember[]> {
  const path = `businesses/${businessId}/members`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as BusinessMember);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getMemberRole(businessId: string, userId: string): Promise<BusinessMember | null> {
  const path = `businesses/${businessId}/members/${userId}`;
  try {
    const mDoc = await getDoc(doc(db, path));
    if (!mDoc.exists()) return null;
    return mDoc.data() as BusinessMember;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function addMemberToBusiness(
  businessId: string,
  actorUserId: string,
  targetUserId: string,
  targetEmail: string,
  targetDisplayName: string,
  role: UserRole
): Promise<void> {
  const path = `businesses/${businessId}/members/${targetUserId}`;
  try {
    const memberRef = doc(db, path);
    await updateDoc(memberRef, {
      userId: targetUserId,
      role,
      status: 'ACTIVE',
      userEmail: targetEmail,
      userDisplayName: targetDisplayName,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      // If doc didn't exist yet
      const batch = writeBatch(db);
      batch.set(memberRef, {
        userId: targetUserId,
        role,
        status: 'ACTIVE',
        userEmail: targetEmail,
        userDisplayName: targetDisplayName,
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    });

    await recordAuditLog(businessId, actorUserId, 'USER_INVITED', {
      entityType: 'MEMBER',
      entityId: targetUserId,
      details: { role, email: targetEmail },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
