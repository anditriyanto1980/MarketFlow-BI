import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

// Prevent duplicate initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with the explicit firestoreDatabaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Prevent storage from retrying for 10 minutes on network or bucket failures
storage.maxUploadRetryTime = 12000;
storage.maxOperationRetryTime = 12000;

// Connectivity check as required by Firebase Integration Skill
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('MarketFlow BI: Firestore client is offline or network connection is pending.');
    }
  }
}

if (typeof window !== 'undefined') {
  testFirestoreConnection();
}
