/**
 * Firebase Admin SDK Initialization
 * STRICT RULE: Only run in server environments (Node.js/Server components/Cloud Functions).
 * Never expose or import in browser client components.
 */

// Placeholder interface for server-side admin initialization
export interface FirebaseAdminInstance {
  projectId: string;
  isInitialized: boolean;
}

export function getFirebaseAdmin(): FirebaseAdminInstance | null {
  // Ensure we are in a true server runtime (Node.js)
  if (typeof window !== 'undefined') {
    console.error('CRITICAL SECURITY WARNING: Firebase Admin SDK must never be called from browser client code.');
    return null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';

  if (!projectId) {
    console.warn('Firebase Admin: No FIREBASE_PROJECT_ID configured in server environment.');
    return null;
  }

  return {
    projectId,
    isInitialized: true,
  };
}
