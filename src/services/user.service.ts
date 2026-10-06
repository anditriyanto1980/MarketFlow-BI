import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase/client';
import { handleFirestoreError, OperationType } from '@/src/utils/errors';
import type { UserProfile } from '@/src/types/auth';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userPath = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return null;
    }
    return userDoc.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function createUserProfile(
  uid: string,
  params: {
    email: string;
    displayName: string;
    photoURL?: string;
    phoneNumber?: string;
  }
): Promise<UserProfile> {
  const userPath = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const existing = await getDoc(userRef);
    if (existing.exists()) {
      return existing.data() as UserProfile;
    }

    const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid,
      email: params.email,
      displayName: params.displayName || params.email.split('@')[0],
      photoURL: params.photoURL || '',
      phoneNumber: params.phoneNumber || '',
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newProfile);
    return {
      ...newProfile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber' | 'photoURL' | 'onboardingCompleted'>>
): Promise<void> {
  const userPath = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}
