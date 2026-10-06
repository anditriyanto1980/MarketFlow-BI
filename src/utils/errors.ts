import { auth } from '@/src/lib/firebase/client';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

export function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        if (
          parsed.error.includes('Missing or insufficient permissions') ||
          parsed.error.includes('permission-denied')
        ) {
          return 'Izin ditolak: Anda tidak memiliki wewenang peran untuk melakukan tindakan ini.';
        }
        if (parsed.error.includes('Quota exceeded')) {
          return 'Batas kuota database tercapai. Harap coba lagi nanti.';
        }
        return parsed.error;
      }
    } catch {
      // Not a JSON error string
    }

    const msg = error.message;

    if (msg.includes('auth/invalid-email')) {
      return 'Format alamat email tidak valid.';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
      return 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'Email ini sudah terdaftar. Silakan masuk menggunakan kata sandi Anda atau gunakan Google.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.';
    }
    if (msg.includes('auth/popup-closed-by-user') || msg.includes('auth/cancelled-popup-request')) {
      return 'Jendela autentikasi ditutup sebelum proses selesai. Silakan coba lagi.';
    }
    if (msg.includes('auth/popup-blocked')) {
      return 'Jendela popup diblokir oleh browser. Izinkan popup untuk melanjutkan.';
    }
    if (msg.includes('network-request-failed') || msg.includes('the client is offline')) {
      return 'Koneksi jaringan terputus. Periksa koneksi internet Anda.';
    }
    if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
      return 'Akses ditolak: Operasi ini dibatasi oleh aturan keamanan bisnis.';
    }
    if (msg.includes('Quota exceeded')) {
      return 'Batas kuota database tercapai untuk hari ini.';
    }
    return msg;
  }
  return 'Terjadi kesalahan sistem yang tidak terduga. Silakan coba lagi.';
}
